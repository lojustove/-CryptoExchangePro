const API_URL = 'http://localhost:3000/api';
let dashboardChart = null;
let userData = null;
let selectedCrypto = 'btc';
let currentTab = 'login';
let growthChart = null;

// Inicializar página
document.addEventListener('DOMContentLoaded', async function () {
    // Verificar si estamos en el dashboard o en la página principal
    const isDashboard = document.getElementById('dashboardChart');

    if (isDashboard) {
        await checkAuth();
        await loadDashboardData();
        initDashboardChart();
        setInterval(loadDashboardData, 30000); // Actualizar cada 30 segundos
    } else {
        // Página principal
        initGrowthChart();
        initCalculator();
        updateCryptoPrices();
        setInterval(updateCryptoPrices, 60000);

        // Verificar código de referido en URL
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        if (refCode) {
            document.getElementById('referral').value = refCode;
        }
    }
});

// ================== PÁGINA PRINCIPAL ==================

// Inicializar gráfico de crecimiento
function initGrowthChart() {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;

    growthChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Día 1', 'Día 10', 'Día 20', 'Día 30', 'Día 40'],
            datasets: [{
                label: 'Tu Inversión',
                data: [1000, 1280, 1640, 2100, 2690],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `$${context.parsed.y.toLocaleString()}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => `$${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

// Inicializar calculadora
function initCalculator() {
    const amountSlider = document.getElementById('amountSlider');
    const amountInput = document.getElementById('amountInput');
    const daysSlider = document.getElementById('daysSlider');

    if (amountSlider) {
        amountSlider.addEventListener('input', (e) => {
            amountInput.value = e.target.value;
            updateCalculator();
        });
    }

    if (amountInput) {
        amountInput.addEventListener('input', (e) => {
            amountSlider.value = e.target.value;
            updateCalculator();
        });
    }

    if (daysSlider) {
        daysSlider.addEventListener('input', updateCalculator);
    }

    // Selector de criptomoneda
    document.querySelectorAll('.calculator-section .crypto-option').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.calculator-section .crypto-option').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Configuración de Supabase
    const SUPABASE_URL = 'https://rynwdfswwrbhuskdcdut.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bndkZnN3d3JiaHVza2RjZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTkyMzIsImV4cCI6MjA4MjIzNTIzMn0.-OV50aPppSm6aJ-UA1Myf4HTGBrVrAWUzNAUPUZjk80';
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let dashboardChart = null;
    let userData = null;
    let selectedCrypto = 'btc';
    let currentTab = 'login';
    let growthChart = null;

    // Inicializar página
    document.addEventListener('DOMContentLoaded', () => {
        // Si estamos en dashboard
        if (window.location.pathname.includes('dashboard.html')) {
            checkAuth();
        } else {
            // Inicializar landing page
            initGrowthChart();
            initCalculator();
            setTimeout(updateCryptoPrices, 100);

            // Verificar si hay código de referido en la URL
            const urlParams = new URLSearchParams(window.location.search);
            const refCode = urlParams.get('ref');
            if (refCode) {
                // Guardamos el código para usarlo al registrarse
                localStorage.setItem('referralCode', refCode);
            }
        }
    });

    updateCalculator();
}

function updateCalculator() {
    const amount = parseFloat(document.getElementById('amountInput')?.value) || 1000;
    const days = parseInt(document.getElementById('daysSlider')?.value) || 40;

    // Algoritmo de rendimiento: aproximadamente 2-5% diario promedio
    const avgDailyRate = 0.035; // 3.5% promedio diario
    const projected = amount * Math.pow(1 + avgDailyRate, days);
    const earnings = projected - amount;

    const initialEl = document.getElementById('initialInvestment');
    const earningsEl = document.getElementById('estimatedEarnings');
    const totalEl = document.getElementById('totalAmount');
    const amountValueEl = document.getElementById('amountValue');
    const daysValueEl = document.getElementById('daysValue');

    if (initialEl) initialEl.textContent = `$${amount.toLocaleString()}`;
    if (earningsEl) earningsEl.textContent = `+$${earnings.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (totalEl) totalEl.textContent = `$${projected.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (amountValueEl) amountValueEl.textContent = `$${amount.toLocaleString()}`;
    if (daysValueEl) daysValueEl.textContent = `${days} días`;

    // Actualizar gráfico
    if (growthChart) {
        const chartData = [];
        for (let i = 0; i <= days; i += Math.max(1, Math.floor(days / 4))) {
            chartData.push(Math.round(amount * Math.pow(1 + avgDailyRate, i)));
        }
        chartData.push(Math.round(projected));

        const labels = chartData.map((_, i) => `Día ${Math.round(i * days / (chartData.length - 1))}`);
        labels[labels.length - 1] = `Día ${days}`;
        labels[0] = 'Día 1';

        growthChart.data.labels = labels;
        growthChart.data.datasets[0].data = chartData;
        growthChart.update();
    }
}

// Actualizar precios de criptomonedas
async function updateCryptoPrices() {
    try {
        const response = await fetch(`${API_URL}/crypto-prices`);
        const data = await response.json();

        if (data.success) {
            const { prices } = data;

            // Actualizar BTC
            const btcPriceEl = document.getElementById('btcPrice');
            const btcChangeEl = document.getElementById('btcChange');
            if (btcPriceEl) btcPriceEl.textContent = `$${prices.btc.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
            if (btcChangeEl) {
                btcChangeEl.textContent = `${prices.btc.change_24h >= 0 ? '+' : ''}${prices.btc.change_24h.toFixed(2)}%`;
                btcChangeEl.className = `price-change ${prices.btc.change_24h >= 0 ? 'positive' : 'negative'}`;
            }

            // Actualizar ETH
            const ethPriceEl = document.getElementById('ethPrice');
            const ethChangeEl = document.getElementById('ethChange');
            if (ethPriceEl) ethPriceEl.textContent = `$${prices.eth.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
            if (ethChangeEl) {
                ethChangeEl.textContent = `${prices.eth.change_24h >= 0 ? '+' : ''}${prices.eth.change_24h.toFixed(2)}%`;
                ethChangeEl.className = `price-change ${prices.eth.change_24h >= 0 ? 'positive' : 'negative'}`;
            }

            // Actualizar SOL
            const solPriceEl = document.getElementById('solPrice');
            const solChangeEl = document.getElementById('solChange');
            if (solPriceEl) solPriceEl.textContent = `$${prices.sol.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
            if (solChangeEl) {
                solChangeEl.textContent = `${prices.sol.change_24h >= 0 ? '+' : ''}${prices.sol.change_24h.toFixed(2)}%`;
                solChangeEl.className = `price-change ${prices.sol.change_24h >= 0 ? 'positive' : 'negative'}`;
            }
        }
    } catch (error) {
        console.error('Error fetching crypto prices:', error);
    }
}

// Mostrar modal de autenticación
function showAuthModal(mode = 'login') {
    const modal = document.getElementById('authModal');
    modal.style.display = 'flex';
    switchTab(mode);
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function switchTab(tab) {
    currentTab = tab;
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => t.classList.remove('active'));

    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('modalTitle').textContent = 'Iniciar Sesión';
        document.getElementById('submitText').textContent = 'Iniciar Sesión';
        document.getElementById('referralGroup').style.display = 'none';
        document.getElementById('switchText').innerHTML = '¿No tienes cuenta? <a href="#" onclick="switchTab(\'register\')">Regístrate</a>';
    } else {
        tabs[1].classList.add('active');
        document.getElementById('modalTitle').textContent = 'Crear Cuenta';
        document.getElementById('submitText').textContent = 'Registrarse';
        document.getElementById('referralGroup').style.display = 'block';
        document.getElementById('switchText').innerHTML = '¿Ya tienes cuenta? <a href="#" onclick="switchTab(\'login\')">Inicia Sesión</a>';
    }
}

// Manejar formulario de autenticación
document.getElementById('authForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const spinner = this.querySelector('.spinner');
    const submitText = this.querySelector('.btn-text');

    spinner.style.display = 'inline-block';
    submitText.style.opacity = '0.5';

    try {
        if (currentTab === 'register') {
            const referralCode = localStorage.getItem('referralCode');
            let referrerId = null;

            // Si hay referido, buscar ID del referrer
            if (referralCode) {
                const { data: referrers } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('referral_code', referralCode)
                    .single();
                if (referrers) referrerId = referrers.id;
            }

            // Registro en Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (error) throw error;

            // El trigger 'handle_new_user' en SQL crea el perfil automáticamente,
            // pero si necesitamos actualizar referrer_id lo hacemos aquí si el usuario ya existe
            // o confiamos en que el trigger lo maneje si pasamos metadata.
            // Para simplificar, actualizamos el perfil recién creado con el referrer
            if (data.user && referrerId) {
                await supabase
                    .from('profiles')
                    .update({ referrer_id: referrerId })
                    .eq('id', data.user.id);
            }

            showNotification('Registro exitoso. Iniciando sesión...', 'success');

            // Auto login tras registro (Supabase a veces lo hace auto, si no forzamos login)
            if (!data.session) {
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (loginError) throw loginError;
            }

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);

        } else {
            // Login
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            showNotification('Bienvenido de nuevo', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        }
    } catch (error) {
        showNotification(error.message, 'error');
        console.error('Auth error:', error);
    } finally {
        spinner.style.display = 'none';
        submitText.style.opacity = '1';
    }
});

// ================== DASHBOARD ==================

// Verificar autenticación
// Verificar autenticación
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // Obtener datos del perfil
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    userData = { user: { ...session.user, ...profile } };

    // UI inicial
    document.getElementById('userEmail').textContent = session.user.email;
    if (profile?.referral_code) {
        document.getElementById('referralCode').textContent = profile.referral_code;
    }

    loadDashboardData();
}

// Cargar datos del dashboard
async function loadDashboardData() {
    if (!userData) return;

    try {
        const userId = userData.user.id;

        // 1. Obtener transacciones
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (txError) throw txError;
        userData.transactions = transactions;

        // 2. Calcular ganancias dinámicas (Backend Serverless)
        // En lugar de leer 'daily_earnings' (que requeriría un cron job),
        // calculamos cuánto debería haber ganado basado en el tiempo transcurrido.

        let totalDeposited = 0;
        let totalEarned = 0;
        let activeInvestments = 0;
        let pendingDeposits = 0;
        let chartData = Array(7).fill(0); // Últimos 7 días
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        userData.recent_earnings = [];

        transactions.forEach(tx => {
            if (tx.type === 'deposit') {
                const amount = parseFloat(tx.usd_value);

                if (tx.status === 'active') {
                    activeInvestments++;
                    totalDeposited += amount;

                    // Calcular días trascurridos desde la activación (aprobación)
                    // Si unlock_date es el futuro (40 días), el inicio fue unlock_date - 40 días
                    // O usamos created_at si fue aprobado al instante, pero mejor usar la fecha real.
                    // Para simplificar esta demo, usaremos created_at como inicio aproximado.

                    const startDate = new Date(tx.created_at);
                    const now = new Date();
                    const diffTime = Math.abs(now - startDate);
                    const daysElapsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    // Tasa diaria 2.5%
                    const dailyRate = 0.025;

                    // Ganancia total acumulada hasta hoy
                    // Interés compuesto: A = P(1 + r)^t - P
                    const currentTotal = amount * Math.pow(1 + dailyRate, daysElapsed);
                    const profit = currentTotal - amount;

                    totalEarned += profit;

                    // Generar datos para el gráfico (últimos 7 días)
                    for (let i = 0; i < 7; i++) {
                        const date = new Date(today);
                        date.setDate(date.getDate() - i);

                        // Si la tx existía en esa fecha
                        if (date >= startDate) {
                            // Calcular ganancia de ESE día específico
                            // Valor al día D - Valor al día D-1
                            const dayDiff = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
                            const valDay = amount * Math.pow(1 + dailyRate, dayDiff);
                            const valPrev = amount * Math.pow(1 + dailyRate, dayDiff - 1);
                            const dailyProfit = valDay - valPrev;

                            chartData[6 - i] += dailyProfit;
                        }
                    }

                } else if (tx.status === 'pending_verification') {
                    pendingDeposits += amount;
                }
            }
        });

        // 3. Obtener bonos por referidos
        const { data: bonuses, error: bonusError } = await supabase
            .from('referral_bonuses')
            .select('amount')
            .eq('referrer_id', userId);

        if (bonusError) throw bonusError;
        const referralEarnings = bonuses.reduce((sum, b) => sum + parseFloat(b.amount), 0);

        // Sumar referidos al total ganado
        totalEarned += referralEarnings;

        userData.stats = {
            total_deposited: totalDeposited,
            total_earned: totalEarned,
            active_investments: activeInvestments,
            pending_deposits: pendingDeposits,
            projected_total: totalDeposited + totalEarned,
            referral_earnings: referralEarnings
        };

        // Estructurar datos para el gráfico
        userData.recent_earnings = chartData.map((val, idx) => ({
            earning: val,
            date: new Date(Date.now() - (6 - idx) * 24 * 60 * 60 * 1000).toISOString()
        }));

        updateDashboardUI();

    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error al cargar datos del dashboard', 'error');
    }
}

// Actualizar información del usuario
function updateUserInfo() {
    if (userData && userData.user) {
        const userEmailEl = document.getElementById('userEmail');
        const referralCodeEl = document.getElementById('referralCode');

        if (userEmailEl) userEmailEl.textContent = userData.user.email;
        if (referralCodeEl) referralCodeEl.textContent = userData.user.referral_code || 'N/A';
    }
}

// Actualizar UI del dashboard
// Actualizar UI del dashboard
function updateDashboardUI() {
    if (!userData) return;

    // Actualizar estadísticas
    const totalInvestedEl = document.getElementById('totalInvested');
    const totalEarningsEl = document.getElementById('totalEarnings');
    const projectedTotalEl = document.getElementById('projectedTotal');
    const referralEarningsEl = document.getElementById('referralEarnings'); // Nuevo
    const daysRemainingEl = document.getElementById('daysRemaining');
    const referralCodeEl = document.getElementById('referralCode'); // Nuevo
    const referralLinkEl = document.getElementById('referralLink'); // Nuevo

    if (totalInvestedEl) totalInvestedEl.textContent = `$${userData.stats.total_deposited.toFixed(2)}`;
    if (totalEarningsEl) totalEarningsEl.textContent = `+$${userData.stats.total_earned.toFixed(2)}`;

    // Si existe elemento de proyeccion (o si lo cambiamos por referidos)
    if (projectedTotalEl) projectedTotalEl.textContent = `$${userData.stats.projected_total.toFixed(2)}`;

    // Estadísticas de referidos
    if (referralEarningsEl) referralEarningsEl.textContent = `+$${(userData.stats.referral_earnings || 0).toFixed(2)}`;

    if (referralCodeEl && userData.user.referral_code) {
        referralCodeEl.textContent = userData.user.referral_code;
    }

    if (referralLinkEl && userData.user.referral_code) {
        referralLinkEl.value = `${window.location.origin}/index.html?ref=${userData.user.referral_code}`;
    }

    // Calcular días restantes
    const transactions = userData.transactions || [];
    const activeTx = transactions.find(tx => tx.status === 'active');
    if (activeTx && activeTx.unlock_date && daysRemainingEl) {
        const unlockDate = new Date(activeTx.unlock_date);
        const now = new Date();
        const daysRemaining = Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24));
        daysRemainingEl.textContent = Math.max(0, daysRemaining);
    }

    // Actualizar transacciones
    updateTransactionsList();

    // Actualizar tabla de ganancias
    updateEarningsTable();

    // Actualizar gráfico
    updateDashboardChart();
}

// Actualizar lista de transacciones
function updateTransactionsList() {
    const transactionsList = document.getElementById('transactionsList');
    if (!transactionsList) return;

    const transactions = userData.transactions || [];

    if (transactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exchange-alt"></i>
                <p>No hay transacciones aún</p>
            </div>
        `;
        return;
    }

    let html = '';
    transactions.slice(0, 5).forEach(tx => {
        const date = new Date(tx.deposit_date).toLocaleDateString();
        let statusClass = 'pending';
        let statusText = 'Pendiente';

        if (tx.status === 'active') {
            statusClass = 'active';
            statusText = 'Activo';
        } else if (tx.status === 'withdrawn') {
            statusClass = 'withdrawn';
            statusText = 'Retirado';
        } else if (tx.status === 'pending_verification') {
            statusClass = 'warning';
            statusText = 'Verificando';
        } else if (tx.status === 'rejected') {
            statusClass = 'error';
            statusText = 'Rechazado';
        }

        html += `
            <div class="transaction-item ${statusClass}">
                <div class="transaction-icon">
                    <i class="fas fa-${tx.type === 'deposit' ? 'arrow-down' : 'arrow-up'}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-type">${tx.type === 'deposit' ? 'Depósito' : 'Retiro'} - ${tx.crypto_type.toUpperCase()}</div>
                    <div class="transaction-date">${date}</div>
                </div>
                <div class="transaction-amount">
                    <span class="amount">$${tx.usd_value.toFixed(2)}</span>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    });

    transactionsList.innerHTML = html;
}

// Actualizar tabla de ganancias
function updateEarningsTable() {
    const earningsTable = document.getElementById('earningsTable');
    if (!earningsTable) return;

    const earnings = userData.recent_earnings || [];

    if (earnings.length === 0) {
        earningsTable.innerHTML = `
            <tr>
                <td colspan="4" class="empty">
                    <i class="fas fa-chart-line"></i>
                    <p>No hay ganancias registradas</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    let totalAccumulated = 0;

    earnings.forEach(earning => {
        totalAccumulated += earning.earning;
        const date = new Date(earning.date).toLocaleDateString();

        html += `
            <tr>
                <td>${date}</td>
                <td class="positive">+$${earning.earning.toFixed(4)}</td>
                <td>${earning.percentage.toFixed(2)}%</td>
                <td>$${totalAccumulated.toFixed(2)}</td>
            </tr>
        `;
    });

    earningsTable.innerHTML = html;
}

// Inicializar gráfico del dashboard
function initDashboardChart() {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;

    dashboardChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Valor Total',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `$${context.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => `$${value}`
                    }
                }
            }
        }
    });
}

// Actualizar gráfico del dashboard
function updateDashboardChart() {
    if (!userData || !userData.recent_earnings || !dashboardChart) return;

    const earnings = userData.recent_earnings;
    const labels = [];
    const data = [];
    let total = userData.stats.total_deposited;

    // Generar datos para los últimos 7 días
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('es-ES', { weekday: 'short' }));

        // Encontrar ganancia para este día
        const dayEarning = earnings.find(e => {
            const earningDate = new Date(e.date).toDateString();
            return earningDate === date.toDateString();
        });

        if (dayEarning) {
            total += dayEarning.earning;
        }

        data.push(total);
    }

    dashboardChart.data.labels = labels;
    dashboardChart.data.datasets[0].data = data;
    dashboardChart.update();
}

// Mostrar modal de depósito
function showDepositModal() {
    const modal = document.getElementById('depositModal');
    if (modal) {
        modal.style.display = 'flex';
        selectCrypto(document.querySelector('.crypto-option[data-crypto="btc"]'));
    }
}

function closeDepositModal() {
    const modal = document.getElementById('depositModal');
    if (modal) modal.style.display = 'none';
}

function selectCrypto(element) {
    if (!element) return;

    document.querySelectorAll('.deposit-modal .crypto-option').forEach(el => {
        el.classList.remove('active');
    });
    element.classList.add('active');
    selectedCrypto = element.dataset.crypto;

    // Actualizar dirección de wallet según la criptomoneda
    const addresses = {
        btc: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        eth: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        sol: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'
    };

    const addressEl = document.getElementById('cryptoAddress');
    if (addressEl) addressEl.textContent = addresses[selectedCrypto];
}

function copyAddress() {
    const address = document.getElementById('cryptoAddress')?.textContent;
    if (address) {
        navigator.clipboard.writeText(address)
            .then(() => showNotification('Dirección copiada al portapapeles', 'success'))
            .catch(() => showNotification('Error al copiar', 'error'));
    }
}

async function confirmDeposit() {
    const amountEl = document.getElementById('depositAmount');
    const amount = parseFloat(amountEl?.value);
    const fileInput = document.getElementById('depositProof');

    if (!amount || amount < 50) {
        showNotification('El monto mínimo es $50', 'error');
        return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        showNotification('Debes subir una captura del comprobante', 'error');
        return;
    }

    if (!confirm(`¿Confirmar depósito de $${amount} en ${selectedCrypto.toUpperCase()}?`)) {
        return;
    }

    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userData.user.id}/${fileName}`;

    try {
        showNotification('Subiendo comprobante...', 'info');

        // 1. Subir imagen a Storage
        const { error: uploadError } = await supabase.storage
            .from('payment_proofs')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Insertar transacción
        const { error: txError } = await supabase
            .from('transactions')
            .insert({
                user_id: userData.user.id,
                type: 'deposit',
                crypto_type: selectedCrypto,
                amount: amount, // Simplificado, valor crypto = valor usd para demo visual
                usd_value: amount,
                status: 'pending_verification',
                payment_proof: filePath
            });

        if (txError) throw txError;

        showNotification('Depósito registrado. Esperando verificación.', 'success');
        closeDepositModal();
        loadDashboardData();

    } catch (error) {
        showNotification(error.message || 'Error al procesar depósito', 'error');
        console.error('Deposit error:', error);
    }
}

function showWithdrawModal() {
    if (!userData || !userData.transactions || userData.transactions.length === 0) {
        showNotification('No tiene depósitos activos para retirar', 'info');
        return;
    }

    const activeTx = userData.transactions.find(tx => tx.status === 'active');
    if (!activeTx) {
        showNotification('No hay depósitos activos disponibles', 'info');
        return;
    }

    const unlockDate = new Date(activeTx.unlock_date);
    const now = new Date();

    if (now < unlockDate) {
        const daysLeft = Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24));
        showNotification(`Fondos bloqueados por ${daysLeft} días más`, 'warning');
        return;
    }

    if (confirm('¿Estás seguro de que deseas retirar tus fondos? Esto finalizará tu inversión.')) {
        processWithdrawal(activeTx.id);
    }
}

async function processWithdrawal(transactionId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/withdraw`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transaction_id: transactionId })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`Retiro exitoso por $${data.amount.toFixed(2)}`, 'success');
            await loadDashboardData();
        } else {
            showNotification(data.error || 'Error al procesar retiro', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
        console.error('Withdrawal error:', error);
    }
}

function copyReferralLink() {
    if (userData && userData.user && userData.user.referral_code) {
        const code = userData.user.referral_code;
        const referralLink = `${window.location.origin}/index.html?ref=${code}`;

        navigator.clipboard.writeText(referralLink)
            .then(() => showNotification('Enlace copiado al portapapeles', 'success'))
            .catch(() => showNotification('Error al copiar enlace', 'error'));
    }
}

function showReferrals() {
    document.querySelector('.sidebar-nav a[onclick="showReferrals()"]').click();
}

function showSettings() {
    const settings = {
        notifications: confirm('¿Deseas activar las notificaciones?'),
        twoFactor: confirm('¿Deseas activar la autenticación de dos factores?')
    };

    if (settings.notifications || settings.twoFactor) {
        showNotification('Configuración actualizada', 'success');
    }
}

function showAllTransactions() {
    if (userData && userData.transactions) {
        let html = '<h3>Todas las Transacciones</h3><div class="transactions-modal">';

        userData.transactions.forEach(tx => {
            const date = new Date(tx.deposit_date).toLocaleString();
            const unlockDate = tx.unlock_date ? new Date(tx.unlock_date).toLocaleDateString() : 'N/A';

            html += `
                <div class="transaction-full">
                    <div class="tx-header">
                        <span class="tx-type">${tx.type.toUpperCase()}</span>
                        <span class="tx-status ${tx.status}">${tx.status}</span>
                    </div>
                    <div class="tx-details">
                        <p><strong>Moneda:</strong> ${tx.crypto_type.toUpperCase()}</p>
                        <p><strong>Monto:</strong> $${tx.usd_value.toFixed(2)}</p>
                        <p><strong>Fecha:</strong> ${date}</p>
                        <p><strong>Desbloqueo:</strong> ${unlockDate}</p>
                        ${tx.tx_hash ? `<p><strong>Hash:</strong> <small>${tx.tx_hash}</small></p>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // Mostrar modal personalizado
        showCustomModal('Todas las Transacciones', html);
    }
}

function showCustomModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal';
    modal.innerHTML = `
        <div class="custom-modal-content">
            <div class="custom-modal-header">
                <h3>${title}</h3>
                <button class="close-custom-modal">&times;</button>
            </div>
            <div class="custom-modal-body">
                ${content}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
    `;

    modal.querySelector('.close-custom-modal').onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `dashboard-notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#6366f1'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Cerrar modales al hacer clic fuera
window.addEventListener('click', function (e) {
    const authModal = document.getElementById('authModal');
    const depositModal = document.getElementById('depositModal');

    if (e.target === authModal) {
        closeAuthModal();
    }
    if (e.target === depositModal) {
        closeDepositModal();
    }
});

// Cerrar con Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeAuthModal();
        closeDepositModal();
        document.querySelectorAll('.custom-modal').forEach(modal => modal.remove());
    }
});

// Agregar estilos adicionales para el dashboard
const dashboardStyles = document.createElement('style');
dashboardStyles.textContent = `
    .dashboard {
        padding: 2rem 0;
    }

    .dashboard-grid {
        display: grid;
        grid-template-columns: 250px 1fr;
        gap: 2rem;
    }

    .sidebar {
        background: var(--dark-light);
        border-radius: 15px;
        padding: 1.5rem;
        border: 1px solid var(--border);
        height: fit-content;
    }

    .sidebar-nav {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 2rem;
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0.8rem 1rem;
        color: var(--light);
        text-decoration: none;
        border-radius: 8px;
        transition: all 0.3s;
        cursor: pointer;
    }

    .nav-item:hover, .nav-item.active {
        background: rgba(99, 102, 241, 0.1);
        color: var(--primary);
    }

    .referral-card {
        background: rgba(99, 102, 241, 0.1);
        padding: 1.5rem;
        border-radius: 10px;
        border: 1px solid var(--primary);
    }

    .referral-card h3 {
        margin-bottom: 1rem;
        color: var(--primary);
    }

    .referral-code {
        background: var(--dark);
        padding: 1rem;
        border-radius: 8px;
        font-family: monospace;
        font-size: 1.2rem;
        letter-spacing: 1px;
        margin-bottom: 1rem;
        text-align: center;
        border: 2px dashed var(--primary);
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .stat-card {
        background: var(--dark-light);
        padding: 1.5rem;
        border-radius: 15px;
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        gap: 1rem;
        transition: transform 0.3s;
    }

    .stat-card:hover {
        transform: translateY(-5px);
    }

    .stat-icon {
        width: 50px;
        height: 50px;
        background: rgba(99, 102, 241, 0.1);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .stat-icon i {
        font-size: 1.5rem;
        color: var(--primary);
    }

    .stat-content h3 {
        font-size: 0.9rem;
        color: var(--gray);
        margin-bottom: 0.3rem;
    }

    .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
    }

    .stat-value.profit {
        color: var(--secondary);
    }

    .chart-card, .transactions-card, .earnings-card {
        background: var(--dark-light);
        padding: 1.5rem;
        border-radius: 15px;
        border: 1px solid var(--border);
        margin-bottom: 1.5rem;
    }

    .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .chart-container {
        height: 300px;
        position: relative;
    }

    .transactions-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .view-all {
        background: transparent;
        border: 1px solid var(--primary);
        color: var(--primary);
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s;
    }

    .view-all:hover {
        background: var(--primary);
        color: white;
    }

    .transactions-list {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }

    .transaction-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: rgba(15, 23, 42, 0.5);
        border-radius: 10px;
        border-left: 4px solid var(--border);
        transition: all 0.3s;
    }

    .transaction-item.active {
        border-left-color: var(--secondary);
    }

    .transaction-item.pending {
        border-left-color: var(--warning);
    }

    .transaction-item.withdrawn {
        border-left-color: var(--primary);
    }

    .transaction-icon {
        width: 40px;
        height: 40px;
        background: rgba(99, 102, 241, 0.1);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .transaction-icon i {
        color: var(--primary);
    }

    .transaction-details {
        flex: 1;
    }

    .transaction-type {
        font-weight: 600;
        margin-bottom: 0.3rem;
    }

    .transaction-date {
        font-size: 0.9rem;
        color: var(--gray);
    }

    .transaction-amount {
        text-align: right;
    }

    .amount {
        display: block;
        font-weight: 700;
        font-size: 1.1rem;
        margin-bottom: 0.3rem;
    }

    .status-badge {
        font-size: 0.8rem;
        padding: 0.2rem 0.6rem;
        border-radius: 20px;
        font-weight: 600;
    }

    .status-badge.active {
        background: rgba(16, 185, 129, 0.1);
        color: var(--secondary);
    }

    .status-badge.pending {
        background: rgba(245, 158, 11, 0.1);
        color: var(--warning);
    }

    .status-badge.withdrawn {
        background: rgba(99, 102, 241, 0.1);
        color: var(--primary);
    }

    .earnings-table {
        overflow-x: auto;
    }

    .earnings-table table {
        width: 100%;
        border-collapse: collapse;
    }

    .earnings-table th {
        text-align: left;
        padding: 1rem;
        color: var(--gray);
        font-weight: 600;
        border-bottom: 1px solid var(--border);
    }

    .earnings-table td {
        padding: 1rem;
        border-bottom: 1px solid var(--border);
    }

    .earnings-table tr:last-child td {
        border-bottom: none;
    }

    .earnings-table .positive {
        color: var(--secondary);
        font-weight: 600;
    }

    .empty-state, .loading {
        text-align: center;
        padding: 3rem;
        color: var(--gray);
    }

    .empty-state i, .loading i {
        font-size: 2rem;
        margin-bottom: 1rem;
        display: block;
    }

    .user-menu {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--dark-light);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        border: 1px solid var(--border);
    }

    .logout-btn {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger);
        border: 1px solid var(--danger);
        padding: 0.5rem 1rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .logout-btn:hover {
        background: var(--danger);
        color: white;
    }

    .deposit-form {
        padding: 1.5rem;
    }

    .deposit-info {
        background: rgba(15, 23, 42, 0.5);
        padding: 1rem;
        border-radius: 10px;
        margin: 1.5rem 0;
        border: 1px solid var(--border);
    }

    .wallet-address {
        background: rgba(15, 23, 42, 0.5);
        padding: 1.5rem;
        border-radius: 10px;
        margin-bottom: 1.5rem;
        border: 1px solid var(--border);
    }

    .address-box {
        display: flex;
        align-items: center;
        gap: 1rem;
        background: var(--dark);
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
        border: 1px solid var(--primary);
    }

    .address-box code {
        flex: 1;
        font-family: monospace;
        word-break: break-all;
        color: var(--light);
    }

    .copy-btn {
        background: transparent;
        border: 1px solid var(--primary);
        color: var(--primary);
        width: 40px;
        height: 40px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
    }

    .copy-btn:hover {
        background: var(--primary);
        color: white;
    }

    .submit-deposit {
        width: 100%;
        padding: 1rem;
        background: var(--gradient);
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
    }

    .submit-deposit:hover {
        transform: translateY(-2px);
    }

    .transaction-full {
        background: rgba(15, 23, 42, 0.5);
        padding: 1rem;
        border-radius: 10px;
        margin-bottom: 1rem;
        border-left: 4px solid var(--primary);
    }

    .tx-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }

    .tx-type {
        font-weight: 600;
        color: var(--primary);
    }

    .custom-modal-content {
        background: var(--dark-light);
        width: 90%;
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
        border-radius: 15px;
        border: 1px solid var(--border);
    }

    .custom-modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        background: var(--dark-light);
        z-index: 1;
    }

    .custom-modal-body {
        padding: 1.5rem;
    }

    .close-custom-modal {
        background: none;
        border: none;
        color: var(--light);
        font-size: 1.8rem;
        cursor: pointer;
        line-height: 1;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }

    @media (max-width: 1024px) {
        .dashboard-grid {
            grid-template-columns: 1fr;
        }
        
        .sidebar {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
        }
        
        .sidebar-nav {
            flex-direction: row;
            flex-wrap: wrap;
            margin-bottom: 0;
        }
        
        .nav-item {
            flex: 1;
            min-width: 140px;
            justify-content: center;
        }
    }

    @media (max-width: 768px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .user-menu {
            flex-direction: column;
            gap: 0.5rem;
        }
    }
`;

document.head.appendChild(dashboardStyles);