// Sistema de Cadastro de Produtos - Pet Shop
// Módulo JavaScript completo para gestão de produtos pet

class PetShopProductManager {
    constructor() {
        this.products = [];
        this.currentProductId = 1;
        this.categories = {
            'racao': '🥘 Ração',
            'petiscos': '🦴 Petiscos e Treats',
            'brinquedos': '🎾 Brinquedos',
            'higiene': '🛁 Higiene e Beleza',
            'medicamentos': '💊 Medicamentos',
            'acessorios': '🎀 Acessórios',
            'camas': '🛏️ Camas e Casinhas',
            'coleiras': '🦮 Coleiras e Guias',
            'aquarismo': '🐠 Aquarismo',
            'passaros': '🐦 Aves',
            'roedores': '🐹 Roedores'
        };
        
        this.animalTypes = {
            'dog': { emoji: '🐕', name: 'Cão' },
            'cat': { emoji: '🐱', name: 'Gato' },
            'bird': { emoji: '🐦', name: 'Ave' },
            'fish': { emoji: '🐠', name: 'Peixe' },
            'rodent': { emoji: '🐹', name: 'Roedor' },
            'rabbit': { emoji: '🐰', name: 'Coelho' }
        };

        this.ageGroups = ['filhote', 'adulto', 'senior'];
        this.petSizes = ['mini', 'pequeno', 'medio', 'grande', 'gigante'];
        
        this.init();
    }

    // Inicialização do sistema
    init() {
        console.log('🐾 Sistema Pet Shop inicializado!');
        this.loadSampleData();
    }

    // Carregar dados de exemplo
    loadSampleData() {
        const sampleProducts = [
            {
                name: 'Ração Premium Golden Adultos',
                category: 'racao',
                brand: 'Golden',
                animals: ['dog'],
                petAge: 'adulto',
                petSize: 'medio',
                weight: 15.0,
                costPrice: 45.00,
                averagePrice: 60.00,
                salePrice: 68.90,
                currentStock: 25,
                minStock: 5,
                expiryDate: '2025-12-15',
                supplier: 'Distribuidora Pet Plus',
                description: 'Ração super premium para cães adultos de porte médio. Rica em proteínas e nutrientes essenciais.'
            },
            {
                name: 'Whiskas Sachê Salmão',
                category: 'racao',
                brand: 'Whiskas',
                animals: ['cat'],
                petAge: 'adulto',
                petSize: 'pequeno',
                weight: 0.085,
                costPrice: 1.20,
                averagePrice: 1.80,
                salePrice: 2.15,
                currentStock: 120,
                minStock: 20,
                expiryDate: '2025-09-30',
                supplier: 'Mars Petcare',
                description: 'Alimento úmido para gatos adultos sabor salmão. Fonte de proteína e hidratação.'
            }
        ];

        sampleProducts.forEach(product => {
            this.addProduct(product);
        });
    }

    // Adicionar novo produto
    addProduct(productData) {
        const product = {
            id: this.currentProductId++,
            ...productData,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Validações específicas para pet shop
        if (!this.validatePetProduct(product)) {
            throw new Error('Dados do produto inválidos');
        }

        this.products.push(product);
        console.log(`✅ Produto adicionado: ${product.name}`);
        
        // Verificar alertas
        this.checkProductAlerts(product);
        
        return product;
    }

    // Validar produto específico para pet shop
    validatePetProduct(product) {
        // Validações obrigatórias
        if (!product.name || product.name.trim() === '') {
            console.error('❌ Nome do produto é obrigatório');
            return false;
        }

        if (!product.category || !this.categories[product.category]) {
            console.error('❌ Categoria inválida');
            return false;
        }

        if (!product.animals || product.animals.length === 0) {
            console.error('❌ Deve especificar pelo

Rafael Almeida, [27/06/2025 17:43]
menos um tipo de animal');
            return false;
        }

        // Validar animais selecionados
        const validAnimals = product.animals.every(animal => 
            this.animalTypes.hasOwnProperty(animal)
        );
        
        if (!validAnimals) {
            console.error('❌ Tipo de animal inválido');
            return false;
        }

        // Validações de preço
        if (product.costPrice < 0 || product.salePrice < 0) {
            console.error('❌ Preços não podem ser negativos');
            return false;
        }

        if (product.salePrice > 0 && product.costPrice > 0 && product.salePrice < product.costPrice) {
            console.warn('⚠️ Preço de venda menor que custo - produto com prejuízo');
        }

        return true;
    }

    // Verificar alertas do produto
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

        // Verificar margem de lucro baixa
        const profitMargin = this.calculateProfitMargin(product.costPrice, product.salePrice);
        if (profitMargin < 10 && profitMargin > 0) {
            alerts.push({
                type: 'profit',
                level: 'info',
                message: `Margem baixa: ${profitMargin.toFixed(1)}%`
            });
        }

        if (alerts.length > 0) {
            console.log(`🚨 Alertas para ${product.name}:`, alerts);
        }

        return alerts;
    }

    // Calcular margem de lucro
    calculateProfitMargin(costPrice, salePrice) {
        if (costPrice <= 0 || salePrice <= 0) return 0;
        return ((salePrice - costPrice) / costPrice) * 100;
    }

    // Calcular dias até vencimento
    getDaysToExpiry(expiryDate) {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Atualizar estoque
    updateStock(productId, newStock, operation = 'set') {
        const product = this.getProductById(productId);
        if (!product) {
            throw new Error('Produto não encontrado');
        }

        const oldStock = product.currentStock;

        switch (operation) {
            case 'add':
                product.currentStock += newStock;
                break;
            case 'subtract':
                product.currentStock = Math.max(0, product.currentStock - newStock);
                break;
            case 'set':
            default:
                product.currentStock = Math.max(0, newStock);
                break;
        }

        product.updatedAt = new Date();
        
        console.log(`📦 Estoque atualizado: ${product.name} (${oldStock} → ${product.currentStock})`);
        
        // Verificar alertas após atualização
        this.checkProductAlerts(product);
        
        return product;
    }

    // Buscar produto por ID
    getProductById(productId) {
        return this.products.find(product => product.id === productId);
    }

    // Buscar produtos por animal
    getProductsByAnimal(animalType) {
        return this.products.filter(product => 
            product.animals.includes(animalType)
        );
    }

    // Buscar produtos por categoria
    getProductsByCategory(category) {
        return this.products.filter(product => 
            product.category === category
        );
    }

    //

Rafael Almeida, [27/06/2025 17:43]
Buscar produtos com estoque baixo
    getLowStockProducts() {
        return this.products.filter(product => 
            product.currentStock <= product.minStock
        );
    }

    // Buscar produtos próximos do vencimento
    getExpiringProducts(days = 30) {
        return this.products.filter(product => {
            if (!product.expiryDate) return false;
            const daysToExpiry = this.getDaysToExpiry(product.expiryDate);
            return daysToExpiry <= days && daysToExpiry >= 0;
        });
    }

    // Buscar produtos por texto
    searchProducts(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.products.filter(product => 
            product.name.toLowerCase().includes(term) ||
            product.brand.toLowerCase().includes(term) ||
            product.description.toLowerCase().includes(term) ||
            this.categories[product.category].toLowerCase().includes(term)
        );
    }

    // Gerar relatório de vendas por animal
    getSalesReportByAnimal() {
        const report = {};
        
        Object.keys(this.animalTypes).forEach(animal => {
            const products = this.getProductsByAnimal(animal);
            const totalValue = products.reduce((sum, product) => 
                sum + (product.salePrice * product.currentStock), 0
            );
            
            report[animal] = {
                name: this.animalTypes[animal].name,
                emoji: this.animalTypes[animal].emoji,
                productCount: products.length,
                totalValue: totalValue,
                averagePrice: products.length > 0 ? totalValue / products.length : 0
            };
        });
        
        return report;
    }

    // Gerar relatório de estoque
    getStockReport() {
        const totalProducts = this.products.length;
        const lowStockProducts = this.getLowStockProducts();
        const expiringProducts = this.getExpiringProducts();
        const totalStockValue = this.products.reduce((sum, product) => 
            sum + (product.salePrice * product.currentStock), 0
        );

        return {
            totalProducts,
            lowStockCount: lowStockProducts.length,
            expiringCount: expiringProducts.length,
            totalStockValue,
            averageProductValue: totalProducts > 0 ? totalStockValue / totalProducts : 0,
            categoryDistribution: this.getCategoryDistribution()
        };
    }

    // Distribuição por categoria
    getCategoryDistribution() {
        const distribution = {};
        
        Object.keys(this.categories).forEach(category => {
            const products = this.getProductsByCategory(category);
            distribution[category] = {
                name: this.categories[category],
                count: products.length,
                percentage: (products.length / this.products.length * 100).toFixed(1)
            };
        });
        
        return distribution;
    }

    // Exportar dados para JSON
    exportToJSON() {
        const data = {
            products: this.products,
            report: this.getStockReport(),
            exportDate: new Date().toISOString()
        };
        
        return JSON.stringify(data, null, 2);
    }

    // Importar dados de JSON
    importFromJSON(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.products && Array.isArray(data.products)) {
                this.products = data.products;
                this.currentProductId = Math.max(...this.products.map(p => p.id)) + 1;
                console.log(`✅ ${this.products.length} produtos importados com sucesso`);
                return true;
            }
        } catch (error) {
            console.error('❌ Erro ao importar dados:', error);
            return false;
        }
    }

    // Remover produto
    removeProduct(productId) {
        const index = this.products.findIndex(product => product.id === productId);
        if (index === -1) {
            throw new Error('Produto não encontrado');
        }

        const removedProduc

Rafael Almeida, [27/06/2025 17:43]
t = this.products.splice(index, 1)[0];
        console.log(`🗑️ Produto removido: ${removedProduct.name}`);
        return removedProduct;
    }

    // Atualizar produto
    updateProduct(productId, updateData) {
        const product = this.getProductById(productId);
        if (!product) {
            throw new Error('Produto não encontrado');
        }

        // Manter dados importantes
        const updatedProduct = {
            ...product,
            ...updateData,
            id: product.id,
            createdAt: product.createdAt,
            updatedAt: new Date()
        };

        // Validar produto atualizado
        if (!this.validatePetProduct(updatedProduct)) {
            throw new Error('Dados atualizados são inválidos');
        }

        // Atualizar no array
        const index = this.products.findIndex(p => p.id === productId);
        this.products[index] = updatedProduct;

        console.log(`✏️ Produto atualizado: ${updatedProduct.name}`);
        this.checkProductAlerts(updatedProduct);
        
        return updatedProduct;
    }

    // Listar todos os produtos
    getAllProducts() {
        return [...this.products];
    }

    // Método para demonstração
    demo() {
        console.log('\n🐾 === DEMO SISTEMA PET SHOP === 🐾\n');
        
        // Mostrar produtos carregados
        console.log('📋 Produtos cadastrados:');
        this.products.forEach(product => {
            const animals = product.animals.map(a => this.animalTypes[a].emoji).join('');
            console.log(`${animals} ${product.name} - R$ ${product.salePrice.toFixed(2)} (${product.currentStock} un.)`);
        });

        // Relatório de estoque
        console.log('\n📊 Relatório de Estoque:');
        const report = this.getStockReport();
        console.log(`• Total de produtos: ${report.totalProducts}`);
        console.log(`• Produtos com estoque baixo: ${report.lowStockCount}`);
        console.log(`• Produtos próximos ao vencimento: ${report.expiringCount}`);
        console.log(`• Valor total do estoque: R$ ${report.totalStockValue.toFixed(2)}`);

        // Produtos por animal
        console.log('\n🐾 Produtos por Animal:');
        const animalReport = this.getSalesReportByAnimal();
        Object.entries(animalReport).forEach(([key, data]) => {
            console.log(`${data.emoji} ${data.name}: ${data.productCount} produtos (R$ ${data.totalValue.toFixed(2)})`);
        });

        // Busca de exemplo
        console.log('\n🔍 Exemplo de busca por "ração":');
        const searchResults = this.searchProducts('ração');
        searchResults.forEach(product => {
            console.log(`• ${product.name} - ${product.brand}`);
        });

        console.log('\n✅ Demo concluída! Sistema pronto para uso.\n');
    }
}

// Exemplo de uso e inicialização
const petShop = new PetShopProductManager();

// Executar demo
petShop.demo();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PetShopProductManager;
}

// Disponibilizar globalmente no browser
if (typeof window !== 'undefined') {
    window.PetShopProductManager = PetShopProductManager;
    window.petShop = petShop;
}

/* 
=== EXEMPLOS DE USO ===

// Criar nova instância
const meuPetShop = new PetShopProductManager();

// Adicionar produto
meuPetShop.addProduct({
    name: 'Brinquedo Bolinha Tênis',
    category: 'brinquedos',
    brand: 'Pet Toys',
    animals: ['dog'],
    petAge: 'adulto',
    petSize: 'medio',
    costPrice: 8.50,
    salePrice: 15.90,
    currentStock: 50,
    minStock: 10,
    description: 'Brinquedo resistente para cães de porte médio'
});

// Buscar produtos para cães
const produtosCao = meuPetShop.getProductsByAnimal('dog');

// Atualizar estoque
meuPetShop.updateStock(1, 5, 'add'); // Adiciona 5 unidades

// Buscar produtos
const resultados = meuPetShop.searchProducts('golden');

// Gerar relatório
const relatorio = meuPetShop.getStockReport();

// Exportar dados
const dados = meuPetShop.exportToJSON();

*/