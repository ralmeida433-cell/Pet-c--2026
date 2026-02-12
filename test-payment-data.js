// Quick test script to verify payment method data
// Open browser console and run this script

console.log('=== TESTING PAYMENT DATA ===');

// Test 1: Check total reservations
db.executeQuery('SELECT COUNT(*) as total FROM reservations').then(result => {
    console.log('📊 Total Reservations:', result[0]?.total || 0);
});

// Test 2: Check reservations with payment_method
db.executeQuery('SELECT COUNT(*) as total FROM reservations WHERE payment_method IS NOT NULL AND payment_method != ""').then(result => {
    console.log('💳 Reservations with payment method:', result[0]?.total || 0);
});

// Test 3: Show sample reservations
db.executeQuery('SELECT id, payment_method, total_value, checkin_date, checkout_date, status FROM reservations WHERE payment_method IS NOT NULL ORDER BY id DESC LIMIT 10').then(result => {
    console.log('📝 Sample Reservations with Payment Method:');
    console.table(result);
});

// Test 4: Test the actual query used by the chart for February 2026
const startDate = '2026-02-01';
const endDate = '2026-02-28';
db.getRevenueByPaymentMethod(startDate, endDate).then(result => {
    console.log(`💰 Revenue by Payment Method (${startDate} to ${endDate}):`);
    console.table(result);
});

console.log('=== END TEST ===');
