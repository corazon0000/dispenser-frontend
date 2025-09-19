// Global variables
let selectedDrink = null;
let selectedPrice = 0;

// API Configuration
const API_BASE_URL = 'https://197289ed5523.ngrok-free.app'; // Ngrok URL untuk backend
const MIDTRANS_CLIENT_KEY = 'Mid-client-t-tLqHkzhLl4jEDD'; // Client Key production baru

// DOM Elements
const drinksSection = document.getElementById('drinks-section');
const orderSection = document.getElementById('order-section');
const statusSection = document.getElementById('status-section');
const loadingSection = document.getElementById('loading-section');
const selectedDrinkName = document.getElementById('selected-drink-name');
const selectedDrinkPrice = document.getElementById('selected-drink-price');
const subtotalElement = document.getElementById('subtotal');
const totalElement = document.getElementById('total');
const statusMessage = document.getElementById('status-message');
const statusIcon = document.getElementById('status-icon');
const payBtn = document.getElementById('pay-btn');

// Function to select drink with enhanced animations
function selectDrink(drinkName, price) {
    selectedDrink = drinkName;
    selectedPrice = price;
    
    // Update UI with animation
    updateOrderDetails(drinkName, price);
    
    // Add visual feedback with enhanced animations
    updateDrinkSelection(drinkName);
    
    // Show order section with smooth transition
    showSection('order');
    
    // Add haptic feedback for mobile devices
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    console.log(`✅ Selected: ${drinkName} - Rp ${price}`);
}

// Function to update order details
function updateOrderDetails(drinkName, price) {
    selectedDrinkName.textContent = drinkName;
    selectedDrinkPrice.textContent = `Rp ${price.toLocaleString('id-ID')}`;
    subtotalElement.textContent = `Rp ${price.toLocaleString('id-ID')}`;
    totalElement.textContent = `Rp ${price.toLocaleString('id-ID')}`;
    
    // Add entrance animation to order details
    const orderDetails = document.querySelector('.order-details');
    orderDetails.style.animation = 'none';
    orderDetails.offsetHeight; // Trigger reflow
    orderDetails.style.animation = 'slideInUp 0.5s ease';
}

// Function to update drink selection visual feedback
function updateDrinkSelection(drinkName) {
    // Remove previous selections
    document.querySelectorAll('.drink-card').forEach(card => {
        card.classList.remove('selected');
        const btn = card.querySelector('.select-btn');
        btn.innerHTML = '<i class="fas fa-shopping-cart"></i><span>Pilih</span>';
    });
    
    // Add selection to current drink
    const selectedCard = document.querySelector(`[data-drink="${drinkName}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        const btn = selectedCard.querySelector('.select-btn');
        btn.innerHTML = '<i class="fas fa-check"></i><span>Dipilih</span>';
        
        // Add pulse animation
        selectedCard.style.animation = 'none';
        selectedCard.offsetHeight; // Trigger reflow
        selectedCard.style.animation = 'pulse 0.6s ease';
    }
}

// Function to cancel order with smooth transition
function cancelOrder() {
    selectedDrink = null;
    selectedPrice = 0;
    
    // Remove selection visual feedback with animation
    document.querySelectorAll('.drink-card').forEach(card => {
        card.classList.remove('selected');
        const btn = card.querySelector('.select-btn');
        btn.innerHTML = '<i class="fas fa-shopping-cart"></i><span>Pilih</span>';
        
        // Add subtle animation
        card.style.transform = 'scale(0.98)';
        setTimeout(() => {
            card.style.transform = '';
        }, 200);
    });
    
    // Show drinks section with transition
    showSection('drinks');
    
    console.log('❌ Order cancelled');
}

// Function to process purchase with enhanced UX
async function processPurchase() {
    if (!selectedDrink) {
        showNotification('Silakan pilih minuman terlebih dahulu', 'warning');
        return;
    }
    
    try {
        // Disable button and show loading state
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Memproses...</span>';
        
        // Show loading section
        showSection('loading');
        
        // Call backend API to create transaction
        const transactionData = await createTransaction(selectedDrink, selectedPrice);
        
        if (!transactionData.token) {
            throw new Error('Token pembayaran tidak ditemukan');
        }
        
        // Hide loading section
        hideSection('loading');
        
        console.log('🔄 Opening Midtrans payment popup...');
        
        // Open Midtrans Snap payment popup with enhanced callbacks
        window.snap.pay(transactionData.token, {
            onSuccess: function(result) {
                console.log('✅ Payment success:', result);
                showPaymentSuccess(result);
            },
            onPending: function(result) {
                console.log('⏳ Payment pending:', result);
                showPaymentPending(result);
            },
            onError: function(result) {
                console.log('❌ Payment error:', result);
                showPaymentError('Pembayaran gagal. Silakan coba lagi.', result);
            },
            onClose: function() {
                console.log('🔒 Payment popup closed');
                showSection('order');
                resetPayButton();
            }
        });
        
    } catch (error) {
        console.error('❌ Error processing purchase:', error);
        hideSection('loading');
        showPaymentError(`Terjadi kesalahan: ${error.message}`);
        resetPayButton();
    }
}

// Function to create transaction via API with retry mechanism
async function createTransaction(drinkName, price, retryCount = 0) {
    const maxRetries = 2; // Kurangi retry untuk efisiensi di production
    
    try {
        const requestBody = {
            item_name: drinkName,
            price: price,
            quantity: 1,
            customer_details: {
                first_name: 'ScanDRINK',
                last_name: 'Customer',
                email: 'customer@scandrink.com'
            }
        };
        
        console.log('📡 Sending request to backend:', requestBody);
        
        const response = await fetch(`${API_BASE_URL}/create-transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Transaction created:', data);
        return data;
        
    } catch (error) {
        console.error(`❌ Error creating transaction (attempt ${retryCount + 1}):`, error);
        
        // Retry mechanism
        if (retryCount < maxRetries && error.message.includes('fetch')) {
            console.log(`🔄 Retrying... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return createTransaction(drinkName, price, retryCount + 1);
        }
        
        throw error; // Tidak pakai mock data di production
    }
}

// Function to show payment success
function showPaymentSuccess(result = {}) {
    statusMessage.textContent = '🎉 Pembayaran berhasil! Minuman sedang diproses...';
    statusMessage.className = 'status-message success';
    statusIcon.className = 'status-icon success';
    statusIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
    showSection('status');
    createConfetti();
    createFloatingParticles();
    
    // Add haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
    
    // Reset order after delay
    resetOrder();
    
    console.log('🎉 Payment completed successfully!');
}

// Function to show payment pending
function showPaymentPending(result = {}) {
    statusMessage.textContent = '⏳ Pembayaran sedang diproses. Silakan tunggu konfirmasi.';
    statusMessage.className = 'status-message pending';
    statusIcon.className = 'status-icon pending';
    statusIcon.innerHTML = '<i class="fas fa-clock"></i>';
    showSection('status');
    resetPayButton();
    console.log('⏳ Payment is pending');
}

// Function to show payment error
function showPaymentError(message, result = {}) {
    statusMessage.textContent = `❌ ${message}`;
    statusMessage.className = 'status-message error';
    statusIcon.className = 'status-icon error';
    statusIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
    showSection('status');
    resetPayButton();
    
    // Add haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
    
    console.log('❌ Payment error occurred');
}

// Function to reset pay button
function resetPayButton() {
    payBtn.disabled = false;
    payBtn.innerHTML = '<i class="fas fa-credit-card"></i><span>Bayar Sekarang</span><div class="btn-shine"></div>';
}

// Function to reset order
function resetOrder() {
    selectedDrink = null;
    selectedPrice = 0;
    resetPayButton();
    
    // Remove selection visual feedback
    document.querySelectorAll('.drink-card').forEach(card => {
        card.classList.remove('selected');
        const btn = card.querySelector('.select-btn');
        btn.innerHTML = '<i class="fas fa-shopping-cart"></i><span>Pilih</span>';
    });
    
    // Show drinks section after delay
    setTimeout(() => {
        showSection('drinks');
    }, 2000);
}

// Function to create confetti effect
function createConfetti() {
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.zIndex = '9999';
        confetti.style.borderRadius = '50%';
        confetti.style.pointerEvents = 'none';
        
        document.body.appendChild(confetti);
        
        // Animate confetti
        const animation = confetti.animate([
            { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
            { transform: `translateY(100vh) rotate(${Math.random() * 360}deg)`, opacity: 0 }
        ], {
            duration: Math.random() * 2000 + 1000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        animation.onfinish = () => confetti.remove();
    }
}

// Function to create floating particles
function createFloatingParticles() {
    const particleContainer = document.querySelector('.status-particles');
    if (!particleContainer) return;
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.backgroundColor = '#10b981';
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animation = `particle-float ${2 + Math.random() * 2}s infinite ease-in-out`;
        particle.style.animationDelay = Math.random() * 2 + 's';
        
        particleContainer.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 4000);
    }
}

// Function to show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide notification
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Utility functions for showing/hiding sections with smooth transitions
function showSection(sectionName) {
    // Hide all sections
    const sections = [drinksSection, orderSection, statusSection, loadingSection];
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section with animation
    let targetSection;
    switch(sectionName) {
        case 'drinks':
            targetSection = drinksSection;
            break;
        case 'order':
            targetSection = orderSection;
            break;
        case 'status':
            targetSection = statusSection;
            break;
        case 'loading':
            targetSection = loadingSection;
            break;
    }
    
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.style.opacity = '0';
        targetSection.style.transform = 'translateY(20px)';
        
        // Trigger animation
        setTimeout(() => {
            targetSection.style.transition = 'all 0.5s ease';
            targetSection.style.opacity = '1';
            targetSection.style.transform = 'translateY(0)';
        }, 10);
    }
}

function hideSection(sectionName) {
    let targetSection;
    switch(sectionName) {
        case 'drinks':
            targetSection = drinksSection;
            break;
        case 'order':
            targetSection = orderSection;
            break;
        case 'status':
            targetSection = statusSection;
            break;
        case 'loading':
            targetSection = loadingSection;
            break;
    }
    
    if (targetSection) {
        targetSection.style.opacity = '0';
        targetSection.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            targetSection.style.display = 'none';
        }, 300);
    }
}

// Initialize app with enhanced startup
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 ScanDRINK App initialized');
    
    // Check if Midtrans Snap is loaded
    if (typeof window.snap === 'undefined') {
        console.warn('⚠️ Midtrans Snap.js belum dimuat. Pastikan client key sudah diatur dengan benar.');
        showNotification('Sistem pembayaran sedang dimuat...', 'warning');
    } else {
        console.log('✅ Midtrans Snap.js loaded successfully');
    }
    
    // Show drinks section by default
    showSection('drinks');
    
    // Add loading animation to logo
    const logo = document.querySelector('.logo-img');
    if (logo) {
        logo.style.animation = 'bounce 2s ease-in-out';
    }
    
    console.log('✨ ScanDRINK ready to serve!');
});

// Enhanced error handling
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Unhandled promise rejection:', event.reason);
    showPaymentError('Terjadi kesalahan sistem. Silakan coba lagi.');
    hideSection('loading');
    resetPayButton();
});

window.addEventListener('error', function(event) {
    console.error('❌ JavaScript error:', event.error);
    if (event.error.message.includes('snap')) {
        showNotification('Sistem pembayaran bermasalah. Silakan refresh halaman.', 'error');
    }
});

// Add keyboard shortcuts for better accessibility
document.addEventListener('keydown', function(event) {
    // ESC key to cancel/go back
    if (event.key === 'Escape') {
        if (orderSection.style.display !== 'none') {
            cancelOrder();
        } else if (statusSection.style.display !== 'none') {
            resetOrder();
        }
    }
    
    // Enter key to proceed with payment
    if (event.key === 'Enter' && orderSection.style.display !== 'none') {
        processPurchase();
    }
});

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log(`⚡ Page loaded in ${Math.round(perfData.loadEventEnd - perfData.fetchStart)}ms`);
        }, 0);
    });
}

