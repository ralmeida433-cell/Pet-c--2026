class InventoryManager {
    constructor() {
        this.currentProductId = null;
        this.currentSaleId = null;
        this.products = [];
        this.sales = [];
        this.filteredProducts = [];
        this.filteredSales = [];
        this.isInitialized = false;
        this.sortConfig = { column: 'name', direction: 'asc' };
        this.charts = {};

        this.categories = {
            'racao': '🥘 Ração',
            'petiscos': '🦴 Petiscos',
            'brinquedos': '🎾 Brinquedos',
            'higiene': '🛁 Higiene',
            'medicamentos': '💊 Medicamentos',
            'acessorios': '🎀 Acessórios',
            'camas': '🛏️ Camas',
            'coleiras': '🦮 Coleiras'
        };

        this.animalTypes = {
            'dog': { emoji: '🐕', name: 'Cães' },
            'cat': { emoji: '🐱', name: 'Gatos' },
            'bird': { emoji: '🐦', name: 'Aves' },
            'fish': { emoji: '🐠', name: 'Peixes' },
            'rodent': { emoji: '🐹', name: 'Roedores' }
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupFormValidation();
        this.setupImageUpload();
        this.loadSampleData();
        console.log('Inventory Manager initialized');
    }

    bindEvents() {
        // Botões principais
        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.openProductModal();
        });

        document.getElementById('stock-report-btn').addEventListener('click', () => {
            this.generateStockReport();
        });

        // NOVO: Botão de venda
        const sellBtn = document.getElementById('sell-product-btn');
        if (sellBtn) {
            sellBtn.addEventListener('click', () => {
                this.openSaleModal();
            });
        }

        // Fechar modais
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.target.closest('#product-modal')) {
                    this.closeProductModal();
                } else if (e.target.closest('#sale-modal')) {
                    this.closeSaleModal();
                }
            });
        });

        // Cancelar ações
        document.getElementById('cancel-product').addEventListener('click', () => {
            this.closeProductModal();
        });

        const cancelSale = document.getElementById('cancel-sale');
        if (cancelSale) {
            cancelSale.addEventListener('click', () => {
                this.closeSaleModal();
            });
        }

        // Formulários
        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        const saleForm = document.getElementById('sale-form');
        if (saleForm) {
            saleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processSale();
            });
        }

        // Filtros e busca
        document.getElementById('product-search').addEventListener('input', this.debounce(() => {
            this.applyFilters();
        }, 300));

        document.getElementById('category-filter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('animal-filter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('stock-status-filter').addEventListener('change', () => {
            this.applyFilters();
        });

        // NOVO: Filtros de relatório
        const reportPeriod = document.getElementById('report-period');
        if (reportPeriod) {
            reportPeriod.addEventListener('change', () => {
                this.updateReports();
            });
        }

        const customPeriod = document.getElementById('custom-period');
        if (customPeriod) {
            customPeriod.addEventListener('change', () => {
                this.updateReports();
            });
        }

        // Fechar modal ao clicar fora
        document.getElementById('product-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeProductModal();
            }
        });

        const saleModal = document.getElementById('sale-modal');
        if (saleModal) {
            saleModal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeSaleModal();
                }
            });
        }
    }

    setupImageUpload() {
        const uploadArea = document.getElementById('image-upload-area');
        const fileInput = document.getElementById('product-image');
        const imagePreview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');
        const removeBtn = document.getElementById('remove-image');

        if (!uploadArea || !fileInput || !imagePreview || !previewImg || !removeBtn) {
            console.warn('Elementos de upload de imagem não encontrados');
            return;
        }

        // Click para selecionar arquivo
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageFile(files[0]);
            }
        });

        // Mudança no input de arquivo
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageFile(e.target.files[0]);
            }
        });

        // Remover imagem
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.removeImage();
        });
    }

    handleImageFile(file) {
        // Validar tipo de arquivo
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            this.showError('Formato de arquivo inválido. Use JPG, PNG ou WEBP.');
            return;
        }

        // Validar tamanho (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            this.showError('Arquivo muito grande. Tamanho máximo: 5MB.');
            return;
        }

        // Ler arquivo e mostrar preview
        const reader = new FileReader();
        reader.onload = (e) => {
            this.showImagePreview(e.target.result);
        };
        reader.onerror = () => {
            this.showError('Erro ao ler arquivo de imagem.');
        };
        reader.readAsDataURL(file);
    }

    showImagePreview(imageSrc) {
        const uploadArea = document.getElementById('image-upload-area');
        const imagePreview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');

        if (uploadArea && imagePreview && previewImg) {
            previewImg.src = imageSrc;
            previewImg.onload = () => {
                uploadArea.style.display = 'none';
                imagePreview.style.display = 'block';
            };
            previewImg.onerror = () => {
                this.showError('Erro ao carregar preview da imagem.');
                this.removeImage();
            };
        }
    }

    removeImage() {
        const uploadArea = document.getElementById('image-upload-area');
        const imagePreview = document.getElementById('image-preview');
        const fileInput = document.getElementById('product-image');
        const previewImg = document.getElementById('preview-img');

        if (fileInput) fileInput.value = '';
        if (previewImg) previewImg.src = '';
        if (uploadArea) uploadArea.style.display = 'block';
        if (imagePreview) imagePreview.style.display = 'none';
    }

    setupFormValidation() {
        const form = document.getElementById('product-form');
        if (!form) return;

        const inputs = form.querySelectorAll('input[required], select[required]');

        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
        });
    }

    loadSampleData() {
        const sampleProducts = [
            {
                name: 'Ração Premium Golden Adultos',
                category: 'racao',
                brand: 'Golden',
                animals: ['dog'],
                costPrice: 45.00,
                salePrice: 68.90,
                currentStock: 25,
                minStock: 5,
                weight: 15.0,
                expiryDate: '2025-12-15',
                supplier: 'Distribuidora Pet Plus',
                description: 'Ração super premium para cães adultos de porte médio.',
                imageUrl: null
            },
            {
                name: 'Whiskas Sachê Salmão',
                category: 'racao',
                brand: 'Whiskas',
                animals: ['cat'],
                costPrice: 1.20,
                salePrice: 2.15,
                currentStock: 120,
                minStock: 20,
                weight: 0.085,
                expiryDate: '2025-09-30',
                supplier: 'Mars Petcare',
                description: 'Alimento úmido para gatos adultos sabor salmão.',
                imageUrl: null
            },
            {
                name: 'Brinquedo Bolinha Tênis',
                category: 'brinquedos',
                brand: 'Pet Toys',
                animals: ['dog'],
                costPrice: 8.50,
                salePrice: 15.90,
                currentStock: 50,
                minStock: 10,
                supplier: 'Brinquedos Pet',
                description: 'Brinquedo resistente para cães de porte médio',
                imageUrl: null
            },
            {
                name: 'Shampoo Neutro',
                category: 'higiene',
                brand: 'Petbath',
                animals: ['dog', 'cat'],
                costPrice: 12.00,
                salePrice: 24.90,
                currentStock: 3,
                minStock: 5,
                weight: 0.5,
                expiryDate: '2025-08-20',
                supplier: 'Higiene Pet',
                description: 'Shampoo neutro para cães e gatos',
                imageUrl: null
            }
        ];

        sampleProducts.forEach(product => {
            this.addProduct(product);
        });

        // Carregar vendas de exemplo
        this.loadSampleSales();
    }

    loadSampleSales() {
        const sampleSales = [
            {
                productId: 1,
                quantity: 2,
                unitPrice: 68.90,
                totalPrice: 137.80,
                costPrice: 45.00,
                profit: 47.80,
                date: '2025-06-20',
                customer: 'João Silva'
            },
            {
                productId: 2,
                quantity: 10,
                unitPrice: 2.15,
                totalPrice: 21.50,
                costPrice: 1.20,
                profit: 9.50,
                date: '2025-06-22',
                customer: 'Maria Santos'
            },
            {
                productId: 3,
                quantity: 1,
                unitPrice: 15.90,
                totalPrice: 15.90,
                costPrice: 8.50,
                profit: 7.40,
                date: '2025-06-25',
                customer: 'Pedro Costa'
            }
        ];

        sampleSales.forEach(sale => {
            this.addSale(sale);
        });
    }

    async loadInventory() {
        try {
            this.showLoading();

            // Aplicar filtros
            this.applyFilters();

            // Renderizar tabela
            this.renderProductsTable();

            // Atualizar estatísticas
            this.updateInventoryStats();

            // Carregar relatórios
            this.loadReportsSection();

            this.hideLoading();
            this.isInitialized = true;
        } catch (error) {
            console.error('Erro ao carregar estoque:', error);
            this.showError('Erro ao carregar estoque');
            this.hideLoading();
        }
    }

    addProduct(productData) {
        const product = {
            id: this.generateId(),
            ...productData,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (!this.validateProduct(product)) {
            throw new Error('Dados do produto inválidos');
        }

        this.products.push(product);
        this.checkProductAlerts(product);
        return product;
    }

    // NOVA FUNCIONALIDADE: Adicionar venda
    addSale(saleData) {
        const sale = {
            id: this.generateId(),
            ...saleData,
            createdAt: new Date()
        };

        // Atualizar estoque do produto
        const product = this.products.find(p => p.id === sale.productId);
        if (product) {
            product.currentStock -= sale.quantity;
            product.updatedAt = new Date();
        }

        this.sales.push(sale);
        return sale;
    }

    generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    validateProduct(product) {
        if (!product.name || product.name.trim() === '') {
            this.showError('Nome do produto é obrigatório');
            return false;
        }

        if (!product.category || !this.categories[product.category]) {
            this.showError('Categoria inválida');
            return false;
        }

        if (!product.animals || product.animals.length === 0) {
            this.showError('Deve especificar pelo menos um tipo de animal');
            return false;
        }

        if (product.costPrice < 0 || product.salePrice < 0) {
            this.showError('Preços não podem ser negativos');
            return false;
        }

        return true;
    }

    checkProductAlerts(product) {
        const alerts = [];

        // Verificar estoque baixo
        if (product.currentStock <= product.minStock) {
            alerts.push({
                type: 'stock',
                level: 'warning',
                message: `Estoque baixo: ${product.currentStock} unidades`
            });
        }

        // Verificar produtos próximos do vencimento
        if (product.expiryDate) {
            const daysToExpiry = this.getDaysToExpiry(product.expiryDate);
            if (daysToExpiry <= 30 && daysToExpiry >= 0) {
                alerts.push({
                    type: 'expiry',
                    level: daysToExpiry <= 7 ? 'critical' : 'warning',
                    message: `Vence em ${daysToExpiry} dias`
                });
            }
        }

        return alerts;
    }

    getDaysToExpiry(expiryDate) {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    applyFilters() {
        const search = document.getElementById('product-search')?.value?.toLowerCase()?.trim() || '';
        const category = document.getElementById('category-filter')?.value || '';
        const animal = document.getElementById('animal-filter')?.value || '';
        const stockStatus = document.getElementById('stock-status-filter')?.value || '';

        this.filteredProducts = this.products.filter(product => {
            const matchesSearch = !search ||
                product.name.toLowerCase().includes(search) ||
                (product.brand && product.brand.toLowerCase().includes(search)) ||
                (product.description && product.description.toLowerCase().includes(search));

            const matchesCategory = !category || product.category === category;
            const matchesAnimal = !animal || product.animals.includes(animal);

            let matchesStatus = true;
            if (stockStatus === 'low') {
                matchesStatus = product.currentStock <= product.minStock;
            } else if (stockStatus === 'expiring') {
                if (product.expiryDate) {
                    const daysToExpiry = this.getDaysToExpiry(product.expiryDate);
                    matchesStatus = daysToExpiry <= 30 && daysToExpiry >= 0;
                } else {
                    matchesStatus = false;
                }
            } else if (stockStatus === 'normal') {
                matchesStatus = product.currentStock > product.minStock;
            }

            return matchesSearch && matchesCategory && matchesAnimal && matchesStatus;
        });

        this.renderProductsTable();
        this.updateInventoryStats();
    }

    renderProductsTable() {
        const tbody = document.querySelector('#products-table tbody');
        if (!tbody) return;

        if (this.filteredProducts.length === 0) {
            tbody.innerHTML = this.getEmptyStateHTML();
            return;
        }

        tbody.innerHTML = this.filteredProducts.map(product => `
            <tr class="product-row" data-product-id="${product.id}">
                <td data-label="Imagem">
                    ${product.imageUrl ?
                `<img src="${product.imageUrl}" alt="${product.name}" class="product-image" 
                         onload="this.style.display='block'" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="product-image-placeholder" style="display: none;"><i class="fas fa-image"></i></div>` :
                `<div class="product-image-placeholder"><i class="fas fa-image"></i></div>`
            }
                </td>
                <td data-label="Produto">
                    <div class="product-info">
                        <strong>${product.name}</strong>
                        ${product.brand ? `<br><small>${product.brand}</small>` : ''}
                    </div>
                </td>
                <td data-label="Categoria">
                    <span class="category-badge">${this.categories[product.category]}</span>
                </td>
                <td data-label="Marca">${product.brand || '-'}</td>
                <td data-label="Animal">
                    ${product.animals.map(animal => this.animalTypes[animal]?.emoji || '🐾').join(' ')}
                </td>
                <td data-label="Estoque">
                    <span class="stock-badge ${product.currentStock <= product.minStock ? 'low-stock' : 'normal-stock'}">
                        ${product.currentStock}
                    </span>
                    <small>/ ${product.minStock} mín.</small>
                </td>
                <td data-label="Preço">
                    <div class="price-info">
                        <strong>${this.formatCurrency(product.salePrice)}</strong>
                        <br><small>Custo: ${this.formatCurrency(product.costPrice)}</small>
                        <br><small class="profit-margin">Margem: ${this.calculateProfitMargin(product.costPrice, product.salePrice).toFixed(1)}%</small>
                    </div>
                </td>
                <td data-label="Vencimento">
                    ${product.expiryDate ? this.formatDate(product.expiryDate) : '-'}
                </td>
                <td data-label="Status">
                    ${this.getStatusBadge(product)}
                </td>
                <td data-label="Ações">
                    <div class="action-buttons">
                        <button class="action-btn sell-btn" onclick="inventoryManager.sellProduct('${product.id}')" title="Vender">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="inventoryManager.editProduct('${product.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="inventoryManager.deleteProduct('${product.id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="action-btn view-btn" onclick="inventoryManager.updateStock('${product.id}')" title="Atualizar Estoque">
                            <i class="fas fa-boxes"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    calculateProfitMargin(costPrice, salePrice) {
        if (costPrice <= 0 || salePrice <= 0) return 0;
        return ((salePrice - costPrice) / costPrice) * 100;
    }

    getStatusBadge(product) {
        const alerts = this.checkProductAlerts(product);

        if (alerts.length === 0) {
            return '<span class="status-badge status-normal">Normal</span>';
        }

        const criticalAlert = alerts.find(alert => alert.level === 'critical');
        if (criticalAlert) {
            return '<span class="status-badge status-critical">Crítico</span>';
        }

        const warningAlert = alerts.find(alert => alert.level === 'warning');
        if (warningAlert) {
            return '<span class="status-badge status-warning">Atenção</span>';
        }

        return '<span class="status-badge status-normal">Normal</span>';
    }

    getEmptyStateHTML() {
        const search = document.getElementById('product-search')?.value || '';
        const hasFilters = search ||
            document.getElementById('category-filter')?.value ||
            document.getElementById('animal-filter')?.value ||
            document.getElementById('stock-status-filter')?.value;

        return `
            <tr>
                <td colspan="10" class="empty-state">
                    <div class="empty-content">
                        <i class="fas fa-boxes"></i>
                        <h3>Nenhum produto encontrado</h3>
                        <p>${hasFilters ? 'Tente ajustar os filtros de busca' : 'Clique em "Novo Produto" para cadastrar o primeiro produto'}</p>
                        ${!hasFilters ? '<button class="btn btn-primary" onclick="inventoryManager.openProductModal()">Novo Produto</button>' : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    updateInventoryStats() {
        const totalProducts = this.products.length;
        const lowStockProducts = this.products.filter(p => p.currentStock <= p.minStock).length;
        const expiringProducts = this.products.filter(p => {
            if (!p.expiryDate) return false;
            const days = this.getDaysToExpiry(p.expiryDate);
            return days <= 30 && days >= 0;
        }).length;
        const stockValue = this.products.reduce((sum, p) => sum + (p.salePrice * p.currentStock), 0);

        const totalEl = document.getElementById('total-products');
        const lowStockEl = document.getElementById('low-stock-products');
        const expiringEl = document.getElementById('expiring-products');
        const valueEl = document.getElementById('stock-value');

        if (totalEl) totalEl.textContent = totalProducts;
        if (lowStockEl) lowStockEl.textContent = lowStockProducts;
        if (expiringEl) expiringEl.textContent = expiringProducts;
        if (valueEl) valueEl.textContent = this.formatCurrency(stockValue);
    }

    // NOVA FUNCIONALIDADE: Vender produto
    sellProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            this.showError('Produto não encontrado');
            return;
        }

        if (product.currentStock <= 0) {
            this.showError('Produto sem estoque');
            return;
        }

        this.openSaleModal(product);
    }

    openSaleModal(product = null) {
        // Criar modal de venda se não existir
        this.createSaleModal();

        const modal = document.getElementById('sale-modal');
        const title = document.getElementById('sale-modal-title');
        const form = document.getElementById('sale-form');

        if (product) {
            title.textContent = `Vender: ${product.name}`;
            document.getElementById('sale-product-id').value = product.id;
            document.getElementById('sale-product-name').value = product.name;
            document.getElementById('sale-unit-price').value = product.salePrice;
            document.getElementById('sale-max-quantity').textContent = product.currentStock;
            document.getElementById('sale-quantity').max = product.currentStock;
            this.calculateSaleTotal();
        } else {
            title.textContent = 'Nova Venda';
            form.reset();
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    createSaleModal() {
        if (document.getElementById('sale-modal')) return;

        const modalHTML = `
            <div id="sale-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="sale-modal-title">Nova Venda</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <form id="sale-form">
                        <input type="hidden" id="sale-product-id">
                        <div class="form-group">
                            <label for="sale-product-name">Produto</label>
                            <input type="text" id="sale-product-name" readonly>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="sale-quantity">Quantidade *</label>
                                <input type="number" id="sale-quantity" min="1" required>
                                <small>Máximo: <span id="sale-max-quantity">0</span> unidades</small>
                            </div>
                            <div class="form-group">
                                <label for="sale-unit-price">Preço Unitário *</label>
                                <input type="number" id="sale-unit-price" step="0.01" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="sale-customer">Cliente</label>
                                <input type="text" id="sale-customer">
                            </div>
                            <div class="form-group">
                                <label for="sale-total">Total</label>
                                <input type="text" id="sale-total" readonly>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancel-sale">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Confirmar Venda</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Bind events para o modal de venda
        document.getElementById('sale-quantity').addEventListener('input', () => {
            this.calculateSaleTotal();
        });

        document.getElementById('sale-unit-price').addEventListener('input', () => {
            this.calculateSaleTotal();
        });
    }

    calculateSaleTotal() {
        const quantity = parseFloat(document.getElementById('sale-quantity').value) || 0;
        const unitPrice = parseFloat(document.getElementById('sale-unit-price').value) || 0;
        const total = quantity * unitPrice;

        document.getElementById('sale-total').value = this.formatCurrency(total);
    }

    processSale() {
        const productId = document.getElementById('sale-product-id').value;
        const quantity = parseInt(document.getElementById('sale-quantity').value);
        const unitPrice = parseFloat(document.getElementById('sale-unit-price').value);
        const customer = document.getElementById('sale-customer').value || 'Cliente não informado';

        const product = this.products.find(p => p.id === productId);
        if (!product) {
            this.showError('Produto não encontrado');
            return;
        }

        if (quantity > product.currentStock) {
            this.showError('Quantidade maior que o estoque disponível');
            return;
        }

        const totalPrice = quantity * unitPrice;
        const totalCost = quantity * product.costPrice;
        const profit = totalPrice - totalCost;

        const sale = {
            productId: productId,
            productName: product.name,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: totalPrice,
            costPrice: product.costPrice,
            totalCost: totalCost,
            profit: profit,
            date: new Date().toISOString().split('T')[0],
            customer: customer
        };

        this.addSale(sale);
        this.closeSaleModal();
        this.applyFilters();
        this.updateReports();
        this.showSuccess(`Venda realizada com sucesso! Lucro: ${this.formatCurrency(profit)}`);
    }

    closeSaleModal() {
        const modal = document.getElementById('sale-modal');
        if (!modal) return;

        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    openProductModal(productId = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const form = document.getElementById('product-form');

        if (!modal || !title || !form) return;

        this.currentProductId = productId;

        if (productId) {
            title.textContent = 'Editar Produto';
            this.populateProductForm(productId);
        } else {
            title.textContent = 'Novo Produto';
            form.reset();
            this.removeImage();
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (!modal) return;

        modal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentProductId = null;
        this.removeImage();
    }

    populateProductForm(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const fields = {
            'product-name': product.name,
            'product-brand': product.brand || '',
            'product-category': product.category,
            'product-cost-price': product.costPrice,
            'product-sale-price': product.salePrice,
            'product-current-stock': product.currentStock,
            'product-min-stock': product.minStock,
            'product-weight': product.weight || '',
            'product-expiry-date': product.expiryDate || '',
            'product-supplier': product.supplier || '',
            'product-description': product.description || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });

        // Selecionar animais
        const animalsSelect = document.getElementById('product-animals');
        if (animalsSelect && product.animals) {
            Array.from(animalsSelect.options).forEach(option => {
                option.selected = product.animals.includes(option.value);
            });
        }

        // Mostrar imagem se existir
        if (product.imageUrl) {
            this.showImagePreview(product.imageUrl);
        }
    }

    saveProduct() {
        const fileInput = document.getElementById('product-image');
        const previewImg = document.getElementById('preview-img');

        // Capturar imagem atual (preview ou existente)
        let imageUrl = null;
        if (previewImg && previewImg.src && previewImg.src !== window.location.href) {
            imageUrl = previewImg.src;
        } else if (this.currentProductId) {
            const existingProduct = this.products.find(p => p.id === this.currentProductId);
            imageUrl = existingProduct?.imageUrl || null;
        }

        this.processSaveProduct(imageUrl);
    }

    processSaveProduct(imageUrl) {
        const productData = {
            name: document.getElementById('product-name')?.value || '',
            brand: document.getElementById('product-brand')?.value || '',
            category: document.getElementById('product-category')?.value || '',
            animals: Array.from(document.getElementById('product-animals')?.selectedOptions || []).map(option => option.value),
            costPrice: parseFloat(document.getElementById('product-cost-price')?.value) || 0,
            salePrice: parseFloat(document.getElementById('product-sale-price')?.value) || 0,
            currentStock: parseInt(document.getElementById('product-current-stock')?.value) || 0,
            minStock: parseInt(document.getElementById('product-min-stock')?.value) || 0,
            weight: parseFloat(document.getElementById('product-weight')?.value) || null,
            expiryDate: document.getElementById('product-expiry-date')?.value || null,
            supplier: document.getElementById('product-supplier')?.value || '',
            description: document.getElementById('product-description')?.value || '',
            imageUrl: imageUrl
        };

        try {
            if (this.currentProductId) {
                this.updateProduct(this.currentProductId, productData);
                this.showSuccess('Produto atualizado com sucesso!');
            } else {
                this.addProduct(productData);
                this.showSuccess('Produto cadastrado com sucesso!');
            }

            this.closeProductModal();
            this.applyFilters();
        } catch (error) {
            this.showError(error.message);
        }
    }

    updateProduct(productId, productData) {
        const index = this.products.findIndex(p => p.id === productId);
        if (index === -1) {
            throw new Error('Produto não encontrado');
        }

        const updatedProduct = {
            ...this.products[index],
            ...productData,
            updatedAt: new Date()
        };

        if (!this.validateProduct(updatedProduct)) {
            throw new Error('Dados do produto inválidos');
        }

        this.products[index] = updatedProduct;
        this.checkProductAlerts(updatedProduct);
    }

    editProduct(productId) {
        this.openProductModal(productId);
    }

    deleteProduct(productId) {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            const index = this.products.findIndex(p => p.id === productId);
            if (index !== -1) {
                const product = this.products[index];
                this.products.splice(index, 1);
                this.showSuccess(`Produto "${product.name}" excluído com sucesso!`);
                this.applyFilters();
            }
        }
    }

    updateStock(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const newStock = prompt(`Estoque atual: ${product.currentStock}\nDigite o novo estoque:`, product.currentStock);
        if (newStock !== null && !isNaN(newStock)) {
            product.currentStock = parseInt(newStock);
            product.updatedAt = new Date();
            this.showSuccess('Estoque atualizado com sucesso!');
            this.applyFilters();
        }
    }

    // NOVA FUNCIONALIDADE: Carregar seção de relatórios
    loadReportsSection() {
        this.createReportsSection();
        this.updateReports();
    }

    createReportsSection() {
        const inventorySection = document.getElementById('inventory');
        if (!inventorySection) return;

        const existingReports = document.getElementById('reports-section');
        if (existingReports) return;

        const reportsHTML = `
            <div id="reports-section" class="reports-section">
                <div class="section-header">
                    <h2>Relatórios de Vendas</h2>
                    <div class="report-filters">
                        <select id="report-period">
                            <option value="month">Este Mês</option>
                            <option value="quarter">Este Trimestre</option>
                            <option value="year">Este Ano</option>
                            <option value="custom">Período Personalizado</option>
                        </select>
                        <input type="month" id="custom-period" style="display: none;">
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="total-sales">0</h3>
                            <p>Total de Vendas</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="total-revenue">R$ 0,00</h3>
                            <p>Receita Total</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="total-profit">R$ 0,00</h3>
                            <p>Lucro Total</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="profit-margin">0%</h3>
                            <p>Margem Média</p>
                        </div>
                    </div>
                </div>

                <div class="charts-container">
                    <div class="chart-card">
                        <h3>Vendas por Período</h3>
                        <div class="chart-wrapper">
                            <canvas id="sales-chart"></canvas>
                        </div>
                    </div>
                    <div class="chart-card">
                        <h3>Produtos Mais Vendidos</h3>
                        <div class="chart-wrapper">
                            <canvas id="products-chart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="recent-sales">
                    <h3>Vendas Recentes</h3>
                    <div class="table-container">
                        <table id="sales-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Produto</th>
                                    <th>Cliente</th>
                                    <th>Qtd</th>
                                    <th>Valor Unit.</th>
                                    <th>Total</th>
                                    <th>Lucro</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        inventorySection.insertAdjacentHTML('beforeend', reportsHTML);

        // Bind events para filtros de relatório
        document.getElementById('report-period').addEventListener('change', (e) => {
            const customPeriod = document.getElementById('custom-period');
            if (e.target.value === 'custom') {
                customPeriod.style.display = 'block';
            } else {
                customPeriod.style.display = 'none';
            }
            this.updateReports();
        });

        document.getElementById('custom-period').addEventListener('change', () => {
            this.updateReports();
        });
    }

    updateReports() {
        const period = document.getElementById('report-period')?.value || 'month';
        const customPeriod = document.getElementById('custom-period')?.value;

        const filteredSales = this.filterSalesByPeriod(period, customPeriod);

        this.updateSalesStats(filteredSales);
        this.renderSalesChart(filteredSales);
        this.renderProductsChart(filteredSales);
        this.renderSalesTable(filteredSales);
    }

    filterSalesByPeriod(period, customPeriod) {
        const now = new Date();
        let startDate, endDate;

        switch (period) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            case 'custom':
                if (customPeriod) {
                    const [year, month] = customPeriod.split('-');
                    startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                    endDate = new Date(parseInt(year), parseInt(month), 0);
                } else {
                    return this.sales;
                }
                break;
            default:
                return this.sales;
        }

        return this.sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= startDate && saleDate <= endDate;
        });
    }

    updateSalesStats(sales) {
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
        const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        document.getElementById('total-sales').textContent = totalSales;
        document.getElementById('total-revenue').textContent = this.formatCurrency(totalRevenue);
        document.getElementById('total-profit').textContent = this.formatCurrency(totalProfit);
        document.getElementById('profit-margin').textContent = `${profitMargin.toFixed(1)}%`;
    }

    renderSalesChart(sales) {
        const ctx = document.getElementById('sales-chart');
        if (!ctx) return;

        // Destruir gráfico existente
        if (this.charts.sales) {
            this.charts.sales.destroy();
        }

        // Agrupar vendas por data
        const salesByDate = sales.reduce((acc, sale) => {
            const date = sale.date;
            if (!acc[date]) {
                acc[date] = { revenue: 0, profit: 0, count: 0 };
            }
            acc[date].revenue += sale.totalPrice;
            acc[date].profit += sale.profit;
            acc[date].count += 1;
            return acc;
        }, {});

        const dates = Object.keys(salesByDate).sort();
        const revenues = dates.map(date => salesByDate[date].revenue);
        const profits = dates.map(date => salesByDate[date].profit);

        this.charts.sales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates.map(date => this.formatDate(date)),
                datasets: [
                    {
                        label: 'Receita',
                        data: revenues,
                        backgroundColor: 'rgba(37, 99, 235, 0.8)',
                        borderColor: 'rgb(37, 99, 235)',
                        borderWidth: 1
                    },
                    {
                        label: 'Lucro',
                        data: profits,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    minimumFractionDigits: 0
                                }).format(value);
                            }
                        }
                    }
                }
            }
        });
    }

    renderProductsChart(sales) {
        const ctx = document.getElementById('products-chart');
        if (!ctx) return;

        // Destruir gráfico existente
        if (this.charts.products) {
            this.charts.products.destroy();
        }

        // Agrupar vendas por produto
        const salesByProduct = sales.reduce((acc, sale) => {
            const productName = sale.productName;
            if (!acc[productName]) {
                acc[productName] = { quantity: 0, revenue: 0 };
            }
            acc[productName].quantity += sale.quantity;
            acc[productName].revenue += sale.totalPrice;
            return acc;
        }, {});

        const products = Object.keys(salesByProduct);
        const quantities = products.map(product => salesByProduct[product].quantity);
        const colors = [
            'rgba(37, 99, 235, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)'
        ];

        this.charts.products = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: products,
                datasets: [{
                    data: quantities,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} unidades (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderSalesTable(sales) {
        const tbody = document.querySelector('#sales-table tbody');
        if (!tbody) return;

        if (sales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-content">
                            <i class="fas fa-shopping-cart"></i>
                            <h3>Nenhuma venda encontrada</h3>
                            <p>Não há vendas no período selecionado</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Ordenar por data (mais recente primeiro)
        const sortedSales = sales.sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = sortedSales.map(sale => `
            <tr>
                <td>${this.formatDate(sale.date)}</td>
                <td>${sale.productName}</td>
                <td>${sale.customer}</td>
                <td>${sale.quantity}</td>
                <td>${this.formatCurrency(sale.unitPrice)}</td>
                <td>${this.formatCurrency(sale.totalPrice)}</td>
                <td class="${sale.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${this.formatCurrency(sale.profit)}
                </td>
            </tr>
        `).join('');
    }

    generateStockReport() {
        const report = {
            totalProducts: this.products.length,
            lowStockProducts: this.products.filter(p => p.currentStock <= p.minStock),
            expiringProducts: this.products.filter(p => {
                if (!p.expiryDate) return false;
                const days = this.getDaysToExpiry(p.expiryDate);
                return days <= 30 && days >= 0;
            }),
            categoryDistribution: this.getCategoryDistribution(),
            stockValue: this.products.reduce((sum, p) => sum + (p.salePrice * p.currentStock), 0),
            salesSummary: this.getSalesSummary()
        };

        console.log('Relatório de Estoque Completo:', report);
        this.showSuccess('Relatório gerado! Verifique o console.');
    }

    getCategoryDistribution() {
        const distribution = {};
        Object.keys(this.categories).forEach(category => {
            const products = this.products.filter(p => p.category === category);
            distribution[category] = {
                name: this.categories[category],
                count: products.length,
                value: products.reduce((sum, p) => sum + (p.salePrice * p.currentStock), 0)
            };
        });
        return distribution;
    }

    getSalesSummary() {
        const totalSales = this.sales.length;
        const totalRevenue = this.sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
        const totalProfit = this.sales.reduce((sum, sale) => sum + sale.profit, 0);
        const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

        return {
            totalSales,
            totalRevenue,
            totalProfit,
            averageTicket,
            profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
        };
    }

    validateField(field) {
        return true;
    }

    clearFieldError(field) {
        // Limpar erros de validação
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return dateStr;
        }
    }

    showLoading() {
        // Implementar loading
    }

    hideLoading() {
        // Ocultar loading
    }

    showSuccess(message) {
        if (window.hotelPetApp) {
            window.hotelPetApp.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (window.hotelPetApp) {
            window.hotelPetApp.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Disponibilizar globalmente
window.inventoryManager = new InventoryManager();
