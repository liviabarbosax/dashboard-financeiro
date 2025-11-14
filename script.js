// Authentication System
const AuthSystem = {
    
    // O método init configura o monitoramento do estado de login
    init() {
        // Usa o onAuthStateChanged do Firebase para gerenciar o estado de login
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // Usuário logado
                AppState.isAuthenticated = true;
                AppState.currentUserId = user.uid; // ESSENCIAL para a segurança e sincronização
                AuthSystem.showMainApp();
                
                // Chamada para a função principal de carregamento de dados após o login
                DataManager.carregarDados();
            } else {
                // Usuário deslogado
                AppState.isAuthenticated = false;
                AppState.currentUserId = null;
                AuthSystem.showLoginScreen();
            }
        });
    },

    // O método login agora usa a função de E-mail/Senha do Firebase
    async login(email, password) {
        const messageEl = document.getElementById('login-message');
        if (messageEl) messageEl.classList.add('hidden');
        
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            // Se for bem-sucedido, o onAuthStateChanged acima cuidará de carregar o app.

        } catch (error) {
            console.error("Erro de login:", error);
            let errorMessage;

            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = "Email ou senha inválidos.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "O formato do email é inválido.";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "Acesso temporariamente bloqueado. Tente novamente mais tarde.";
                    break;
                default:
                    errorMessage = `Erro de autenticação: ${error.message}`;
            }

            if (messageEl) {
                messageEl.textContent = errorMessage;
                messageEl.classList.remove('hidden');
            }
        }
    },

    async logout() {
        try {
            await firebase.auth().signOut();
            // O onAuthStateChanged cuidará de mostrar a tela de login
            // DataManager.limparDadosLocais(); // Se houver necessidade de limpar dados locais de outros usuários
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
        }
    },

    showLoginScreen() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    },

    showMainApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
    }
};

// Theme System
const ThemeSystem = {
    init() {
        this.setTheme(AppState.currentTheme);
    },
    
    setTheme(theme) {
        AppState.setTheme(theme);
        document.body.className = document.body.className.replace(/\b(light|dark)\b/g, '');
        document.body.classList.add(theme);
        
        const toggle = document.getElementById('theme-toggle');
        const icon = document.getElementById('theme-icon');
        
        if (theme === 'light') {
            toggle.classList.add('active');
            if (icon) icon.innerHTML = `<path fill-rule="evenodd" d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" clip-rule="evenodd"></path>`;
        } else {
            toggle.classList.remove('active');
            if (icon) icon.innerHTML = `<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>`;
        }
    },
    
    toggle() {
        const newTheme = AppState.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
};

// Export System
const ExportSystem = {
    exportToPDF(data, filename) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Relatório de Pedidos', 20, 20);
        doc.setFontSize(12);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 35);
        
        let y = 50;
        const headers = ['Data', 'Cliente', 'Produto', 'Valor', 'Lucro', 'Status'];
        const colWidths = [25, 35, 40, 25, 25, 25];
        let x = 20;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        headers.forEach((header, i) => {
            doc.text(header, x, y);
            x += colWidths[i];
        });
        
        y += 10;
        doc.setFont(undefined, 'normal');
        data.forEach(pedido => {
            if (y > 270) { 
                doc.addPage();
                y = 20;
            }
            
            x = 20;
            const row = [
                this.formatDate(pedido.data),
                pedido.cliente?.substring(0, 15) || '',
                pedido.produto?.substring(0, 20) || '',
                FinanceCalculations.formatarMoeda(pedido.valorShopee),
                FinanceCalculations.formatarMoeda(pedido.lucro),
                pedido.status || ''
            ];
            
            row.forEach((cell, i) => {
                doc.text(cell.toString(), x, y);
                x += colWidths[i];
            });
            y += 8;
        });
        
        doc.save(filename);
    },
    
    exportToExcel(data, filename) {
        const ws = XLSX.utils.json_to_sheet(data.map(pedido => ({
            'Data': this.formatDate(pedido.data),
            'Cliente': pedido.cliente || '',
            'Número Pedido': pedido.numeroPedido || '',
            'Produto': pedido.produto || '',
            'Valor Shopee': pedido.valorShopee || 0,
            'Taxa %': pedido.taxaShopee || 0,
            'Valor Líquido': pedido.valorLiquido || 0,
            'Custo Fornecedor': pedido.custoFornecedor || 0,
            'Pagador': pedido.pagador || '',
            'Data Pagamento': this.formatDate(pedido.dataPagamento),
            'Data Recebimento': this.formatDate(pedido.dataRecebimento),
            'Lucro': pedido.lucro || 0,
            'Método Pagamento': pedido.metodoPagamento || '',
            'Status': pedido.status || ''
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
        XLSX.writeFile(wb, filename);
    },
    
    formatDate(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        } catch {
            return '';
        }
    }
};

// Filter System
const FilterSystem = {
    applyOrderFilters() {
        const dataInicio = document.getElementById('filtro-data-inicio')?.value;
        const dataFim = document.getElementById('filtro-data-fim')?.value;
        const produto = document.getElementById('filtro-produto')?.value;
        const status = document.getElementById('filtro-status-pedidos')?.value;
        
        const filteredData = AppState.pedidos.filter(pedido => {
            let matches = true;
            
            if (dataInicio && pedido.data < dataInicio) matches = false;
            if (dataFim && pedido.data > dataFim) matches = false;
            if (produto && pedido.produto !== produto) matches = false;
            if (status && pedido.status !== status) matches = false;
            
            return matches;
        });
        
        AppState.setFilteredData(filteredData);
        this.updateOrderTable();
        this.updateProductFilter();
    },
    
    updateOrderTable() {
        const tbody = document.querySelector('#pedidos-tbody');
        if (!tbody) return;
        
        const dataToShow = AppState.filteredData.length > 0 ? AppState.filteredData : AppState.pedidos;
        
        if (dataToShow.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="14" class="py-8 px-4 text-center text-slate-400">
                        Nenhum pedido encontrado com os filtros aplicados.
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = dataToShow.map(pedido => {
            const statusIcon = pedido.status === 'Pendente' ? 
                '<svg class="w-4 h-4 text-yellow-400 inline mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>' : '';
            
            return `
                <tr class="border-b border-slate-700 dark:border-slate-700 light:border-slate-300 hover:bg-slate-700/30 transition-colors">
                    <td class="py-3 px-2 text-white dark:text-white light:text-slate-800 text-xs">${DataManager.formatarData(pedido.data)}</td>
                    <td class="py-3 px-2 text-white dark:text-white light:text-slate-800 text-xs">${pedido.cliente || '-'}</td>
                    <td class="py-3 px-2 text-white dark:text-white light:text-slate-800 text-xs">${pedido.numeroPedido || '-'}</td>
                    <td class="py-3 px-2 text-slate-300 dark:text-slate-300 light:text-slate-600 text-xs">${pedido.produto || '-'}</td>
                    <td class="py-3 px-2 text-green-400 font-semibold text-xs">${FinanceCalculations.formatarMoeda(pedido.valorShopee)}</td>
                    <td class="py-3 px-2 text-white dark:text-white light:text-slate-800 text-xs">${pedido.taxaShopee || 0}%</td>
                    <td class="py-3 px-2 text-green-400 font-semibold text-xs">${FinanceCalculations.formatarMoeda(pedido.valorLiquido)}</td>
                    <td class="py-3 px-2 text-red-400 text-xs">${FinanceCalculations.formatarMoeda(pedido.custoFornecedor)}</td>
                    <td class="py-3 px-2 text-white dark:text-white light:text-slate-800 text-xs">${pedido.pagador || '-'}</td>
                    <td class="py-3 px-2 text-slate-300 dark:text-slate-300 light:text-slate-600 text-xs">${DataManager.formatarData(pedido.dataPagamento)}</td>
                    <td class="py-3 px-2 text-slate-300 dark:text-slate-300 light:text-slate-600 text-xs">${DataManager.formatarData(pedido.dataRecebimento)}</td>
                    <td class="py-3 px-2 text-green-400 font-semibold text-xs">${FinanceCalculations.formatarMoeda(pedido.lucro)}</td>
                    <td class="py-3 px-2">
                        <span class="${DataManager.getStatusColor(pedido.status)} px-2 py-1 rounded-full text-xs flex items-center">
                            ${statusIcon}${pedido.status}
                        </span>
                    </td>
                    <td class="py-3 px-2">
                        <div class="flex gap-1">
                            <button data-action="edit" data-order-id="${pedido.__backendId}"
                                class="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded bg-blue-900/20 hover:bg-blue-900/40 transition-colors">
                                Editar
                            </button>
                            <button data-action="delete" data-order-id="${pedido.__backendId}"
                                class="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-900/20 hover:bg-red-900/40 transition-colors">
                                Excluir
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    updateProductFilter() {
        const select = document.getElementById('filtro-produto');
        if (!select) return;
        
        const produtos = [...new Set(AppState.pedidos.map(p => p.produto).filter(Boolean))];
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">Todos os produtos</option>';
        produtos.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto;
            option.textContent = produto;
            if (produto === currentValue) option.selected = true;
            select.appendChild(option);
        });
    },
    
    clearOrderFilters() {
        document.getElementById('filtro-data-inicio').value = '';
        document.getElementById('filtro-data-fim').value = '';
        document.getElementById('filtro-produto').value = '';
        document.getElementById('filtro-status-pedidos').value = '';
        AppState.setFilteredData([]);
        this.updateOrderTable();
    }
};

// Sistema de Notificações
function mostrarNotificacao(mensagem, tipo = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    
    const cores = {
        success: 'bg-green-600 border-green-500',
        error: 'bg-red-600 border-red-500',
        warning: 'bg-yellow-600 border-yellow-500',
        info: 'bg-blue-600 border-blue-500'
    };
    
    const icones = {
        success: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>',
        error: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>',
        warning: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>',
        info: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>'
    };
    
    notification.className = `${cores[tipo]} border-l-4 text-white p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0 max-w-sm`;
    notification.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0">${icones[tipo]}</div>
            <div class="ml-3"><p class="text-sm font-medium">${mensagem}</p></div>
            <div class="ml-auto pl-3">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
    }, 100);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// 🔥 FIREBASE CONFIGURATION (Suas credenciais)
const firebaseConfig = {
    apiKey: "AIzaSyBrNkVfac72YegNXio0oAhlgw6vL3_JxzQ",
    authDomain: "dashboard-financeiro-5f2ba.firebaseapp.com",
    projectId: "dashboard-financeiro-5f2ba",
    storageBucket: "dashboard-financeiro-5f2ba.firebasestorage.app",
    messagingSenderId: "40824893830",
    appId: "1:40824893830:web:a687e3fa6b8ddb9563bc07"
};

// Initialize Firebase
let firebaseApp = null;
let firestore = null;
let auth = null;
let isFirebaseEnabled = false;

try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firestore = firebase.firestore();
    auth = firebase.auth();
    isFirebaseEnabled = true;
    console.log('🔥 Firebase inicializado com sucesso');
} catch (error) {
    console.log('🔥 Firebase não disponível - funcionando offline:', error.message);
    isFirebaseEnabled = false;
}

// 🔥 CENTRALIZED STATE MANAGEMENT - Single Source of Truth
const AppState = {
    // Data state
    pedidos: [],
    config: {
        saldoInicial: 0,
        mesReferencia: '',
        metaLucro: 10000
    },
    
    // UI state
    currentPage: 'dashboard',
    isLoading: false,
    editingOrderId: null,
    filteredData: [],
    currentTheme: 'dark',
    isAuthenticated: false,
    currentUserId: null, // Novo campo para o UID do Firebase
    charts: {},
    
    // Methods to update state with local saving
    updatePedidos(newPedidos) { 
        this.pedidos = Array.isArray(newPedidos) ? [...newPedidos] : [];
        this.saveToLocalStorage();
    },
    
    updateConfig(newConfig) { 
        this.config = { ...this.config, ...newConfig };
        this.saveToLocalStorage();
    },
    
    setCurrentPage(page) { this.currentPage = page; },
    setLoading(loading) { this.isLoading = loading; },
    setEditingOrderId(id) { this.editingOrderId = id; },
    setFilteredData(data) { this.filteredData = Array.isArray(data) ? [...data] : []; },
    
    setTheme(theme) { 
        this.currentTheme = theme;
        localStorage.setItem('dashboard_theme', theme);
    },
    
    setAuthenticated(auth) { 
        this.isAuthenticated = auth;
        localStorage.setItem('dashboard_authenticated', auth.toString());
    },
    
    addChart(id, chart) { 
        this.charts[id] = chart; 
    },
    
    removeChart(id) {
        if (this.charts[id]) {
            this.charts[id].destroy();
            delete this.charts[id];
        }
    },
    
    // Save relevant state to LocalStorage
    saveToLocalStorage() {
        try {
            // Salvamos os dados ligados ao ID do usuário para multi-usuário (embora não tenhamos implementado a troca)
            const userIdKey = AppState.currentUserId || 'default_user';
            localStorage.setItem(`dashboard_pedidos_data_${userIdKey}`, JSON.stringify(this.pedidos));
            localStorage.setItem(`dashboard_config_data_${userIdKey}`, JSON.stringify(this.config));
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar AppState em LocalStorage:', error);
            return false;
        }
    },
    
    // Load state from LocalStorage
    loadFromLocalStorage() {
        try {
            const userIdKey = AppState.currentUserId || 'default_user';
            const pedidosData = localStorage.getItem(`dashboard_pedidos_data_${userIdKey}`);
            const configData = localStorage.getItem(`dashboard_config_data_${userIdKey}`);
            const themeData = localStorage.getItem('dashboard_theme');
            
            // Carrega dados específicos do usuário
            if (pedidosData) { this.pedidos = JSON.parse(pedidosData); } else { this.pedidos = []; }
            if (configData) { this.config = { ...this.config, ...JSON.parse(configData) }; } else { this.config = { saldoInicial: 0, mesReferencia: '', metaLucro: 10000 }; }
            
            // Carrega estados globais (como tema)
            if (themeData) { this.currentTheme = themeData; }

            // Não dependemos mais do estado de autenticação do localStorage, o Firebase cuida disso.
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao carregar AppState do LocalStorage:', error);
            return false;
        }
    },
    
    reset() {
        this.pedidos = [];
        this.config = { saldoInicial: 0, mesReferencia: '', metaLucro: 10000 };
        this.currentPage = 'dashboard';
        this.isLoading = false;
        this.editingOrderId = null;
        this.filteredData = [];
        this.currentTheme = 'dark';
        this.isAuthenticated = false;
        this.currentUserId = null;
        Object.keys(this.charts).forEach(id => this.removeChart(id));
    }
};

// Configuration object for Element SDK (simplificado)
const defaultConfig = {
    app_title: "Dashboard Financeiro Avançado",
    current_month: "Janeiro 2024",
    saldo_inicial: "R$ 5.000,00",
    meta_lucro: "R$ 10.000,00",
    background_color: "#1E293B",
    surface_color: "#334155",
    text_color: "#FFFFFF",
    primary_color: "#3B82F6",
    accent_color: "#22C55E"
};

// Financial Calculations Module
const FinanceCalculations = {
    calcularValorLiquido(valorShopee, taxaShopee) {
        if (!valorShopee || !taxaShopee) return 0;
        return valorShopee - (valorShopee * (taxaShopee / 100));
    },

    calcularLucro(valorLiquido, custoFornecedor) {
        if (!valorLiquido || !custoFornecedor) return 0;
        return valorLiquido - custoFornecedor;
    },

    calcularTicketMedio(totalVendas, totalPedidos) {
        if (!totalVendas || !totalPedidos || totalPedidos === 0) return 0;
        return totalVendas / totalPedidos;
    },

    calcularMargemLucro(lucro, totalVendas) {
        if (!lucro || !totalVendas || totalVendas === 0) return 0;
        return (lucro / totalVendas) * 100;
    },

    calcularSaldoFinal(saldoInicial, lucroLiquido) {
        if (!saldoInicial) saldoInicial = 0;
        if (!lucroLiquido) lucroLiquido = 0;
        return saldoInicial + lucroLiquido;
    },

    formatarMoeda(valor) {
        if (typeof valor === 'string') {
            valor = parseFloat(valor.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        }
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    },

    converterMoedaParaNumero(valorString) {
        if (typeof valorString === 'number') return valorString;
        if (!valorString) return 0;
        return parseFloat(valorString.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    }
};

let currentPage = 'dashboard';
let pedidosData = [];
let isLoading = false;
let configData = { saldoInicial: 0, mesReferencia: '', metaLucro: 10000 };

// Chart Management System
const ChartManager = {
    destroyChart(chartId) { AppState.removeChart(chartId); },

    createBarChart(canvasId, data, label, color = '#3B82F6') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        AppState.removeChart(canvasId);

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: label,
                    data: Object.values(data),
                    backgroundColor: color,
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true }, x: {} }
            }
        });
        AppState.addChart(canvasId, chart);
    },
    
    createLineChart(canvasId, data, label, color = '#22C55E') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        AppState.removeChart(canvasId);

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: label,
                    data: Object.values(data),
                    borderColor: color,
                    backgroundColor: color + '20',
                    fill: true,
                    tension: 0.4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true }, x: {} }
            }
        });
        AppState.addChart(canvasId, chart);
    },

    createDoughnutChart(canvasId, data, colors = ['#EF4444', '#22C55E']) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        AppState.removeChart(canvasId);

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    data: data.map(item => item.valor),
                    backgroundColor: colors,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            }
        });
        AppState.addChart(canvasId, chart);
    },

    createHorizontalBarChart(canvasId, data, colors = ['#3B82F6', '#22C55E']) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        AppState.removeChart(canvasId);

        const labels = data.map(([produto]) => produto);
        const valores = data.map(([, stats]) => stats.vendas);

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Vendas',
                    data: valores,
                    backgroundColor: colors.slice(0, data.length),
                    borderRadius: 6,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true }, y: {} }
            }
        });
        AppState.addChart(canvasId, chart);
    }
};

// 🔥 FIREBASE MANAGER
const FirebaseManager = {
    userId: null,
    isOnline: navigator.onLine,
    syncInProgress: false,

    async init() {
        // A inicialização principal do Firebase Auth é feita pelo AuthSystem.init()
        // Este método se concentra em configurar listeners de conectividade.
        this.setupConnectivityListener();
        
        // Se o usuário já estiver logado (AuthSystem.init já deve ter determinado isso),
        // o DataManager.carregarDados() deve ser chamado para sincronização inicial.
    },

    setupConnectivityListener() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            mostrarNotificacao('Conectado! Sincronizando dados...', 'info');
            updateConnectivityStatus();
            if (AppState.isAuthenticated) this.syncToFirebase();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            mostrarNotificacao('Modo offline ativado', 'warning');
            updateConnectivityStatus();
        });
    },

    setupRealtimeListener() {
        if (!firestore || !AppState.currentUserId) return;

        const userId = AppState.currentUserId;
        
        // Listener para pedidos
        firestore.collection('users').doc(userId).collection('pedidos')
            .onSnapshot((snapshot) => {
                if (this.syncInProgress) return;
                
                const firebasePedidos = [];
                snapshot.forEach((doc) => {
                    firebasePedidos.push({
                        __backendId: doc.id,
                        ...doc.data()
                    });
                });

                // Comparação de dados para evitar loops de sincronização desnecessários
                if (JSON.stringify(firebasePedidos.sort()) !== JSON.stringify(AppState.pedidos.sort())) {
                    AppState.updatePedidos(firebasePedidos);
                    DataManager.atualizarInterface();
                    mostrarNotificacao('Dados de pedidos sincronizados!', 'success');
                }
            });

        // Listener para configurações
        firestore.collection('users').doc(userId).collection('config').doc('settings')
            .onSnapshot((doc) => {
                if (this.syncInProgress) return;
                if (doc.exists) {
                    const firebaseConfig = doc.data();
                    if (JSON.stringify(firebaseConfig) !== JSON.stringify(AppState.config)) {
                        AppState.updateConfig(firebaseConfig);
                        DataManager.atualizarInterface();
                        mostrarNotificacao('Configurações sincronizadas!', 'success');
                    }
                }
            });
    },

    async syncFromFirebase() {
        if (!this.isOnline || !firestore || !AppState.currentUserId) return;

        const userId = AppState.currentUserId;
        
        try {
            this.syncInProgress = true;
            const pedidosSnapshot = await firestore.collection('users').doc(userId).collection('pedidos').get();
            const firebasePedidos = [];
            
            pedidosSnapshot.forEach((doc) => {
                firebasePedidos.push({
                    __backendId: doc.id,
                    ...doc.data()
                });
            });

            const configDoc = await firestore.collection('users').doc(userId).collection('config').doc('settings').get();
            if (configDoc.exists) {
                AppState.updateConfig(configDoc.data());
            }

            AppState.updatePedidos(firebasePedidos);
            return true;
        } catch (error) {
            console.error('🔥 Erro ao sincronizar do Firebase:', error);
            return false;
        } finally {
            this.syncInProgress = false;
        }
    },
    
    async syncToFirebase() {
        if (!this.isOnline || !firestore || !AppState.currentUserId || this.syncInProgress) return;

        const userId = AppState.currentUserId;
        
        try {
            this.syncInProgress = true;
            const batch = firestore.batch();
            const pedidosRef = firestore.collection('users').doc(userId).collection('pedidos');
            
            const existingPedidos = await pedidosRef.get();
            existingPedidos.forEach((doc) => { batch.delete(doc.ref); });

            AppState.pedidos.forEach((pedido) => {
                const docRef = pedidosRef.doc();
                const pedidoData = { ...pedido };
                delete pedidoData.__backendId; 
                batch.set(docRef, pedidoData);
            });

            const configRef = firestore.collection('users').doc(userId).collection('config').doc('settings');
            batch.set(configRef, AppState.config);

            await batch.commit();
            return true;
        } catch (error) {
            console.error('🔥 Erro ao sincronizar para Firebase:', error);
            return false;
        } finally {
            this.syncInProgress = false;
        }
    },

    async addPedido(pedidoData) {
        if (!this.isOnline || !firestore || !AppState.currentUserId) return null;
        try {
            const docRef = await firestore.collection('users').doc(AppState.currentUserId).collection('pedidos').add(pedidoData);
            return docRef.id;
        } catch (error) { return null; }
    },

    async updatePedido(pedidoId, pedidoData) {
        if (!this.isOnline || !firestore || !AppState.currentUserId) return false;
        try {
            await firestore.collection('users').doc(AppState.currentUserId).collection('pedidos').doc(pedidoId).update(pedidoData);
            return true;
        } catch (error) { return false; }
    },

    async deletePedido(pedidoId) {
        if (!this.isOnline || !firestore || !AppState.currentUserId) return false;
        try {
            await firestore.collection('users').doc(AppState.currentUserId).collection('pedidos').doc(pedidoId).delete();
            return true;
        } catch (error) { return false; }
    },

    async forcSync() {
        if (!this.isOnline) {
            mostrarNotificacao('Sem conexão com a internet', 'warning');
            return false;
        }

        mostrarNotificacao('Sincronizando dados...', 'info');
        const success = await this.syncToFirebase();
        
        if (success) {
            mostrarNotificacao('Dados sincronizados com sucesso!', 'success');
        } else {
            mostrarNotificacao('Erro na sincronização', 'error');
        }

        return success;
    }
};

// Data Management System
const DataManager = {
    carregarDados() {
        // Carrega dados do LocalStorage (usuário específico)
        const loaded = AppState.loadFromLocalStorage();
        
        // Configura o listener de tempo real do Firebase após carregar o local
        if (isFirebaseEnabled && AppState.isAuthenticated && AppState.currentUserId) {
            FirebaseManager.setupRealtimeListener();
        }

        // Tenta sincronizar se estiver online e autenticado (prioriza nuvem sobre local)
        if (isFirebaseEnabled && navigator.onLine && AppState.isAuthenticated) {
            FirebaseManager.syncFromFirebase();
        }

        // Atualiza as referências globais
        pedidosData = AppState.pedidos;
        configData = AppState.config;
        this.atualizarInterface();
        return loaded;
    },

    salvarDados() {
        const saved = AppState.saveToLocalStorage();
        if (saved) {
            this.tentarSincronizarFirebase();
        } else {
            mostrarNotificacao('Erro ao salvar dados localmente', 'error');
        }
        return saved;
    },

    async tentarSincronizarFirebase() {
        if (!isFirebaseEnabled || !FirebaseManager.isOnline || !AppState.isAuthenticated) return;
        try {
            await FirebaseManager.syncToFirebase();
        } catch (error) {
            console.log('🔥 Sincronização com Firebase falhou:', error.message);
        }
    },

    atualizarInterface() {
        pedidosData = AppState.pedidos;
        configData = AppState.config;
        this.updateDashboardMetrics();
        this.updatePedidosTable();
        this.updateResumoFinanceiro();
        this.updateFechamentoMes();
        FilterSystem.updateProductFilter();
        if (currentPage === 'resumo') { aplicarFiltros(); }
        if (currentPage === 'pedidos') { FilterSystem.applyOrderFilters(); }
    },

    onDataChanged(data) {
        console.log('📊 onDataChanged chamado (modo compatibilidade)');
        if (data && Array.isArray(data)) {
            AppState.updatePedidos(data);
            this.atualizarInterface();
        }
    },

    updateDashboardMetrics() {
        this.updateDashboardKPIs();
        
        const totalCashEl = document.getElementById('total-cash');
        const saldoInicial = FinanceCalculations.converterMoedaParaNumero(configData.saldoInicial || 0);
        const lucroTotal = AppState.pedidos.reduce((sum, p) => sum + (p.lucro || 0), 0);
        const saldoFinal = FinanceCalculations.calcularSaldoFinal(saldoInicial, lucroTotal);
        if (totalCashEl) {
            totalCashEl.textContent = FinanceCalculations.formatarMoeda(saldoFinal);
            totalCashEl.classList.toggle('text-red-400', saldoFinal < 0);
            totalCashEl.classList.toggle('text-green-400', saldoFinal >= 0);
        }

        this.updateRecentActivity();
    },

    updateDashboardKPIs() {
        const totalVendas = pedidosData.reduce((sum, p) => sum + (p.valorShopee || 0), 0);
        const totalPedidos = pedidosData.length;
        const lucroTotal = pedidosData.reduce((sum, p) => sum + (p.lucro || 0), 0);
        const ticketMedio = FinanceCalculations.calcularTicketMedio(totalVendas, totalPedidos);
        const margemLucro = FinanceCalculations.calcularMargemLucro(lucroTotal, totalVendas);

        document.getElementById('kpi-lucro-total').textContent = FinanceCalculations.formatarMoeda(lucroTotal);
        document.getElementById('kpi-total-vendas').textContent = FinanceCalculations.formatarMoeda(totalVendas);
        document.getElementById('kpi-total-pedidos').textContent = totalPedidos.toString();
        document.getElementById('kpi-ticket-medio').textContent = FinanceCalculations.formatarMoeda(ticketMedio);
        document.getElementById('kpi-margem-lucro').textContent = `${margemLucro.toFixed(1)}%`;

        this.updatePainelMetas(lucroTotal);
        this.updateAllCharts();
    },

    updatePainelMetas(lucroAtual) {
        const metaLucro = FinanceCalculations.converterMoedaParaNumero(configData.metaLucro || 10000);
        const progresso = metaLucro > 0 ? Math.min((lucroAtual / metaLucro) * 100, 100) : 0;
        const restante = Math.max(metaLucro - lucroAtual, 0);

        const progressoTexto = document.getElementById('meta-progresso-texto');
        const progressoBarra = document.getElementById('meta-progresso-barra');
        const metaAlcancado = document.getElementById('meta-alcancado');
        const metaRestante = document.getElementById('meta-restante');
        const diasMes = document.getElementById('stat-dias-mes');
        const diasRestantesEl = document.getElementById('stat-dias-restantes');
        const mediaDiaria = document.getElementById('stat-media-diaria');
        const lucroMedioDiaEl = document.getElementById('stat-lucro-medio-dia');

        if (progressoTexto) progressoTexto.textContent = `${progresso.toFixed(0)}%`;
        if (progressoBarra) progressoBarra.style.width = `${progresso}%`;
        if (metaAlcancado) metaAlcancado.textContent = FinanceCalculations.formatarMoeda(lucroAtual);
        if (metaRestante) metaRestante.textContent = FinanceCalculations.formatarMoeda(restante);

        const hoje = new Date();
        const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
        const diasRestantesVal = Math.max(diasNoMes - hoje.getDate(), 0);
        const diasDecorridos = Math.max(hoje.getDate(), 1);
        const mediaDiariaNecessaria = diasRestantesVal > 0 ? restante / diasRestantesVal : 0;
        const lucroMedioDiaVal = diasDecorridos > 0 ? lucroAtual / diasDecorridos : 0;

        if (diasMes) diasMes.textContent = diasNoMes.toString();
        if (diasRestantesEl) diasRestantesEl.textContent = diasRestantesVal.toString();
        if (mediaDiaria) mediaDiaria.textContent = FinanceCalculations.formatarMoeda(mediaDiariaNecessaria);
        if (lucroMedioDiaEl) lucroMedioDiaEl.textContent = FinanceCalculations.formatarMoeda(lucroMedioDiaVal);
    },

    updateAllCharts() {
        this.updateLucroMesChart();
        this.updateVendasMesChart();
        this.updateCustoLucroChart();
        this.updateTopProdutosChart();
    },

    updateLucroMesChart() {
        const lucrosPorMes = this.agruparDadosPorMes(pedidosData, 'lucro');
        ChartManager.createBarChart('lucro-mes-chart', lucrosPorMes, 'Lucro', '#22C55E');
    },

    updateVendasMesChart() {
        const vendasPorMes = this.agruparDadosPorMes(pedidosData, 'valorShopee');
        ChartManager.createLineChart('vendas-mes-chart', vendasPorMes, 'Vendas', '#3B82F6');
    },

    updateCustoLucroChart() {
        const totalCusto = pedidosData.reduce((sum, p) => sum + (p.custoFornecedor || 0), 0);
        const totalLucro = pedidosData.reduce((sum, p) => sum + (p.lucro || 0), 0);

        if (totalCusto === 0 && totalLucro === 0) {
            ChartManager.destroyChart('custo-lucro-chart');
            return;
        }

        const data = [
            { label: 'Custos', valor: totalCusto },
            { label: 'Lucro', valor: totalLucro }
        ];
        ChartManager.createDoughnutChart('custo-lucro-chart', data, ['#EF4444', '#22C55E']);
    },

    updateTopProdutosChart() {
        const produtoStats = {};
        pedidosData.forEach(pedido => {
            const produto = pedido.produto || 'Não Informado';
            if (!produtoStats[produto]) {
                produtoStats[produto] = { vendas: 0, lucro: 0, quantidade: 0 };
            }
            produtoStats[produto].vendas += pedido.valorShopee || 0;
            produtoStats[produto].lucro += pedido.lucro || 0;
            produtoStats[produto].quantidade += 1;
        });

        const topProdutos = Object.entries(produtoStats)
            .sort(([,a], [,b]) => b.vendas - a.vendas)
            .slice(0, 5);

        ChartManager.createHorizontalBarChart('top-produtos-chart', topProdutos);
    },

    agruparDadosPorMes(dados, campo) {
        const agrupados = {};
        dados.forEach(item => {
            if (!item.data) return;
            const data = new Date(item.data);
            const mesAno = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
            if (!agrupados[mesAno]) agrupados[mesAno] = 0;
            agrupados[mesAno] += item[campo] || 0;
        });
        return agrupados;
    },

    updateRecentActivity() {
        const recentContainer = document.getElementById('atividade-recente-container');
        if (!recentContainer) return;

        const recentPedidos = pedidosData
            .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))
            .slice(0, 5);

        if (recentPedidos.length === 0) {
            recentContainer.innerHTML = `
                <div class="flex items-center justify-center p-8 bg-slate-700/50 dark:bg-slate-700/50 light:bg-slate-100 rounded-xl">
                    <span class="text-slate-400 dark:text-slate-400 light:text-slate-600">Nenhuma atividade recente</span>
                </div>
            `;
            return;
        }

        recentContainer.innerHTML = recentPedidos.map((pedido) => {
            const timeAgo = this.calcularTempoDecorrido(pedido.dataHora);
            const statusColorClass = this.getStatusColorIndicator(pedido.status);
            
            return `
                <div class="flex items-center justify-between p-4 bg-slate-700/50 dark:bg-slate-700/50 light:bg-slate-100 rounded-xl hover:bg-slate-700/70 transition-colors">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 ${statusColorClass} rounded-full"></div>
                        <div>
                            <span class="text-white dark:text-white light:text-slate-800 font-medium">Pedido ${pedido.numeroPedido}</span>
                            <p class="text-slate-400 dark:text-slate-400 light:text-slate-600 text-sm">${pedido.cliente} • ${pedido.produto}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-green-400 font-semibold">${FinanceCalculations.formatarMoeda(pedido.valorShopee)}</span>
                        <p class="text-slate-400 dark:text-slate-400 light:text-slate-600 text-xs">${timeAgo}</p>
                    </div>
                </div>
            `;
        }).join('');
    },

    calcularTempoDecorrido(dataHora) {
        if (!dataHora) return 'Agora';
        
        const agora = new Date();
        const data = new Date(dataHora);
        const diffMs = agora - data;
        const diffMinutos = Math.floor(diffMs / (1000 * 60));
        const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutos < 1) return 'Agora';
        if (diffMinutos < 60) return `${diffMinutos}min atrás`;
        if (diffHoras < 24) return `${diffHoras}h atrás`;
        return `${diffDias}d atrás`;
    },

    updatePedidosTable() { FilterSystem.updateOrderTable(); },

    formatarData(dataString) {
        if (!dataString) return '-';
        try {
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR');
        } catch {
            return '-';
        }
    },

    updateResumoFinanceiro() {
        this.updateResumoComFiltros();
        this.updateMetodosPagamento();
    },

    updateMetodosPagamento() {
        const metodos = {};
        let totalGeral = 0;

        pedidosData.forEach(pedido => {
            const metodo = pedido.metodoPagamento || 'Não informado';
            const valor = pedido.valorShopee || 0;
            
            if (!metodos[metodo]) metodos[metodo] = 0;
            metodos[metodo] += valor;
            totalGeral += valor;
        });

        const metodosContainer = document.querySelector('#metodos-pagamento-container');
        if (!metodosContainer) return;

        if (Object.keys(metodos).length === 0) {
            metodosContainer.innerHTML = `<div class="flex items-center justify-center p-4 text-slate-400 dark:text-slate-400 light:text-slate-600">Nenhum método de pagamento registrado</div>`;
            return;
        }

        metodosContainer.innerHTML = Object.entries(metodos).map(([metodo, valor]) => {
            const percentual = totalGeral > 0 ? ((valor / totalGeral) * 100).toFixed(0) : 0;
            return `
                <div class="flex justify-between items-center">
                    <span class="text-slate-300 dark:text-slate-300 light:text-slate-600">${metodo}</span>
                    <span class="text-white dark:text-white light:text-slate-800 font-semibold">${FinanceCalculations.formatarMoeda(valor)} (${percentual}%)</span>
                </div>
            `;
        }).join('');
    },

    filtrarDados(mes = '', ano = '') {
        if (!mes && !ano) return pedidosData;
        
        return pedidosData.filter(pedido => {
            if (!pedido.data) return false;
            
            const dataPedido = new Date(pedido.data);
            const mesPedido = String(dataPedido.getMonth() + 1).padStart(2, '0');
            const anoPedido = String(dataPedido.getFullYear());
            
            const mesMatch = !mes || mesPedido === mes;
            const anoMatch = !ano || anoPedido === ano;
            
            return mesMatch && anoMatch;
        });
    },

    updateResumoComFiltros(dadosFiltrados = null) {
        const dados = dadosFiltrados || pedidosData;
        
        const totalVendas = dados.reduce((sum, p) => sum + (p.valorShopee || 0), 0);
        const totalTaxas = dados.reduce((sum, p) => sum + ((p.valorShopee || 0) * (p.taxaShopee || 0) / 100), 0);
        const totalRecebido = dados.reduce((sum, p) => sum + (p.valorLiquido || 0), 0);
        const totalPago = dados.reduce((sum, p) => sum + (p.custoFornecedor || 0), 0);
        const lucroTotal = dados.reduce((sum, p) => sum + (p.lucro || 0), 0);

        const totalVendasEl = document.getElementById('total-vendas');
        const totalTaxasEl = document.getElementById('total-taxas');
        const totalRecebidoEl = document.getElementById('total-recebido');
        const totalPagoEl = document.getElementById('total-pago');
        const lucroTotalEl = document.getElementById('lucro-total');

        if (totalVendasEl) totalVendasEl.textContent = FinanceCalculations.formatarMoeda(totalVendas);
        if (totalTaxasEl) totalTaxasEl.textContent = FinanceCalculations.formatarMoeda(totalTaxas);
        if (totalRecebidoEl) totalRecebidoEl.textContent = FinanceCalculations.formatarMoeda(totalRecebido);
        if (totalPagoEl) totalPagoEl.textContent = FinanceCalculations.formatarMoeda(totalPago);
        if (lucroTotalEl) lucroTotalEl.textContent = FinanceCalculations.formatarMoeda(lucroTotal);

        this.updateGraficoLucros(dados);
    },

    updateGraficoLucros(dados) {
        const lucrosPorMes = this.agruparDadosPorMes(dados, 'lucro');
        ChartManager.createBarChart('chart-canvas', lucrosPorMes, 'Lucro', '#22C55E');
    },

    updateFechamentoMes() {
        const saldoInicial = FinanceCalculations.converterMoedaParaNumero(configData.saldoInicial || 0);
        const totalVendas = pedidosData.reduce((sum, p) => sum + (p.valorShopee || 0), 0);
        const totalRecebido = pedidosData.reduce((sum, p) => sum + (p.valorLiquido || 0), 0);
        const despesas = pedidosData.reduce((sum, p) => sum + (p.custoFornecedor || 0), 0);
        const lucroLiquido = pedidosData.reduce((sum, p) => sum + (p.lucro || 0), 0);
        const saldoFinal = FinanceCalculations.calcularSaldoFinal(saldoInicial, lucroLiquido);
        
        const numeroPedidos = pedidosData.length;
        const ticketMedio = FinanceCalculations.calcularTicketMedio(totalVendas, numeroPedidos);
        const margemLucro = FinanceCalculations.calcularMargemLucro(lucroLiquido, totalVendas);

        const saldoInicialEl = document.getElementById('saldo-inicial-display');
        const totalVendasMesEl = document.getElementById('total-vendas-mes');
        const totalRecebidoMesEl = document.getElementById('total-recebido-mes');
        const despesasMesEl = document.getElementById('despesas-mes');
        const lucroLiquidoMesEl = document.getElementById('lucro-liquido-mes');
        const saldoFinalEl = document.getElementById('saldo-final-display');
        const numeroPedidosMesEl = document.getElementById('numero-pedidos-mes');
        const ticketMedioMesEl = document.getElementById('ticket-medio-mes');
        const margemLucroMesEl = document.getElementById('margem-lucro-mes');

        if (saldoInicialEl) saldoInicialEl.textContent = FinanceCalculations.formatarMoeda(saldoInicial);
        if (totalVendasMesEl) totalVendasMesEl.textContent = FinanceCalculations.formatarMoeda(totalVendas);
        if (totalRecebidoMesEl) totalRecebidoMesEl.textContent = FinanceCalculations.formatarMoeda(totalRecebido);
        if (despesasMesEl) despesasMesEl.textContent = FinanceCalculations.formatarMoeda(despesas);
        if (lucroLiquidoMesEl) lucroLiquidoMesEl.textContent = FinanceCalculations.formatarMoeda(lucroLiquido);
        if (saldoFinalEl) saldoFinalEl.textContent = FinanceCalculations.formatarMoeda(saldoFinal);
        if (numeroPedidosMesEl) numeroPedidosMesEl.textContent = numeroPedidos.toString();
        if (ticketMedioMesEl) ticketMedioMesEl.textContent = FinanceCalculations.formatarMoeda(ticketMedio);
        if (margemLucroMesEl) margemLucroMesEl.textContent = `${margemLucro.toFixed(1)}%`;
        
        const periodoAtivoEl = document.getElementById('periodo-ativo');
        if (periodoAtivoEl && pedidosData.length > 0) {
            const datas = pedidosData.map(p => new Date(p.data)).filter(d => !isNaN(d));
            if (datas.length > 0) {
                const dataInicial = new Date(Math.min(...datas));
                const dataFinal = new Date(Math.max(...datas));
                const diasAtivos = Math.ceil((dataFinal - dataInicial) / (1000 * 60 * 60 * 24)) + 1;
                periodoAtivoEl.textContent = `${diasAtivos} dias`;
            }
        }
    },

    getStatusColor(status) {
        switch (status?.toLowerCase()) {
            case 'finalizado': return 'bg-green-600 text-white';
            case 'pago': return 'bg-green-600 text-white';
            case 'entregue': return 'bg-blue-600 text-white';
            case 'processando': return 'bg-yellow-600 text-white';
            case 'pendente': return 'bg-yellow-600 text-white';
            case 'cancelado': return 'bg-red-600 text-white';
            default: return 'bg-gray-600 text-white';
        }
    },

    getStatusColorIndicator(status) {
        switch (status?.toLowerCase()) {
            case 'finalizado': return 'bg-green-400';
            case 'pago': return 'bg-green-400';
            case 'entregue': return 'bg-blue-400';
            case 'processando': return 'bg-yellow-400';
            case 'pendente': return 'bg-yellow-400';
            case 'cancelado': return 'bg-red-400';
            default: return 'bg-gray-400';
        }
    }
};

// 🔥 FIREBASE STATUS FUNCTIONS
function updateConnectivityStatus() {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const syncBtn = document.getElementById('firebase-sync-btn');
    
    if (!indicator || !statusText || !syncBtn) return;
    
    // Mostra status de Sincronizado apenas se o usuário estiver logado E online
    if (isFirebaseEnabled && FirebaseManager.isOnline && AppState.isAuthenticated) {
        indicator.className = 'w-3 h-3 bg-green-400 rounded-full mr-2';
        statusText.textContent = 'Sincronizado';
        syncBtn.classList.remove('hidden');
    } else if (navigator.onLine) {
        // Online, mas não logado ou Firebase desabilitado
        indicator.className = 'w-3 h-3 bg-yellow-400 rounded-full mr-2';
        statusText.textContent = 'Online (Local)';
        syncBtn.classList.add('hidden');
    } else {
        // Offline
        indicator.className = 'w-3 h-3 bg-red-400 rounded-full mr-2';
        statusText.textContent = 'Offline';
        syncBtn.classList.add('hidden');
    }
}

function sincronizarManualmente() {
    if (isFirebaseEnabled && AppState.isAuthenticated) {
        FirebaseManager.forcSync();
    } else {
        mostrarNotificacao('É necessário estar logado e conectado para sincronizar.', 'warning');
    }
}

// Global Functions
function realizarLogin(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    
    if (!emailInput || !passwordInput || !loginBtn) return;
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    // Desabilitar botão e mostrar loading (visual)
    loginBtn.disabled = true;
    const loginText = document.getElementById('login-text');
    const loginLoading = document.getElementById('login-loading');
    if (loginText && loginLoading) {
        loginText.classList.add('hidden');
        loginLoading.classList.remove('hidden');
    }

    // Usar timeout para simular delay de rede (melhora UX)
    setTimeout(async () => {
        await AuthSystem.login(email, password);

        // Habilitar botão e esconder loading
        loginBtn.disabled = false;
        if (loginText && loginLoading) {
            loginText.classList.remove('hidden');
            loginLoading.classList.add('hidden');
        }

        // Limpar campo de senha se o login falhar
        if (!AppState.isAuthenticated) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }, 500); // Meio segundo de espera
}

function realizarLogout() {
    AuthSystem.logout();
}

function toggleTheme() {
    ThemeSystem.toggle();
}

function aplicarFiltrosPedidos() {
    FilterSystem.applyOrderFilters();
}

function limparFiltrosPedidos() {
    FilterSystem.clearOrderFilters();
}

function exportarPedidosPDF() {
    const dataToExport = FilterSystem.filteredData.length > 0 ? FilterSystem.filteredData : pedidosData;
    if (dataToExport.length === 0) {
        mostrarNotificacao('Nenhum pedido para exportar', 'warning');
        return;
    }
    
    const filename = `pedidos-${new Date().toISOString().split('T')[0]}.pdf`;
    ExportSystem.exportToPDF(dataToExport, filename);
    mostrarNotificacao('PDF exportado com sucesso!', 'success');
}

function exportarPedidosExcel() {
    const dataToExport = FilterSystem.filteredData.length > 0 ? FilterSystem.filteredData : pedidosData;
    if (dataToExport.length === 0) {
        mostrarNotificacao('Nenhum pedido para exportar', 'warning');
        return;
    }
    
    const filename = `pedidos-${new Date().toISOString().split('T')[0]}.xlsx`;
    ExportSystem.exportToExcel(dataToExport, filename);
    mostrarNotificacao('Excel exportado com sucesso!', 'success');
}

// Funções de Filtros de Resumo
function aplicarFiltros() {
    const mes = document.getElementById('filtro-mes')?.value || '';
    const ano = document.getElementById('filtro-ano')?.value || '';
    
    const dadosFiltrados = DataManager.filtrarDados(mes, ano);
    DataManager.updateResumoComFiltros(dadosFiltrados);
}

function limparFiltros() {
    document.getElementById('filtro-mes').value = '';
    document.getElementById('filtro-ano').value = '';
    aplicarFiltros();
}

// Funções de Fechamento - Offline First
function atualizarSaldoInicial() {
    const valor = parseFloat(document.getElementById('saldo-inicial-input').value) || 0;
    configData.saldoInicial = valor;
    
    DataManager.salvarDados();
    DataManager.updateFechamentoMes();
    DataManager.updateDashboardMetrics();
}

function atualizarMesReferencia() {
    const mes = document.getElementById('mes-referencia').value;
    configData.mesReferencia = mes;
    
    DataManager.salvarDados();
}

function editarMeta() {
    const novaMetaStr = prompt('Digite a nova meta de lucro mensal (apenas números):', configData.metaLucro || 10000);
    if (novaMetaStr !== null) {
        const novaMeta = parseFloat(novaMetaStr) || 10000;
        configData.metaLucro = novaMeta;
        
        DataManager.salvarDados();
        
        const metaLucroEl = document.getElementById('meta-lucro-valor');
        if (metaLucroEl) metaLucroEl.textContent = FinanceCalculations.formatarMoeda(novaMeta);
        DataManager.updateDashboardMetrics();
        
        mostrarNotificacao('Meta de lucro atualizada com sucesso!', 'success');
    }
}

function abrirNovoMes() {
    const saldoFinalEl = document.getElementById('saldo-final-display');
    const novoSaldo = FinanceCalculations.converterMoedaParaNumero(saldoFinalEl?.textContent || 'R$ 0,00');
    const mesRef = document.getElementById('mes-referencia').value;
    
    if (!mesRef) {
        mostrarNotificacao('Selecione o mês de referência primeiro', 'warning');
        return;
    }
    
    configData.saldoInicial = novoSaldo;
    
    DataManager.salvarDados();
    const saldoInicialInput = document.getElementById('saldo-inicial-input');
    if (saldoInicialInput) saldoInicialInput.value = novoSaldo.toFixed(2);
    DataManager.updateFechamentoMes();
    DataManager.updateDashboardMetrics();

    mostrarNotificacao(`Novo mês aberto com saldo inicial de ${FinanceCalculations.formatarMoeda(novoSaldo)}`, 'success');
}

function fecharMesAtual() {
    const saldoFinal = document.getElementById('saldo-final-display')?.textContent || 'R$ 0,00';
    mostrarNotificacao(`Mês fechado com saldo final de ${saldoFinal}`, 'success');
}

function exportarRelatorio() {
    const dados = {
        saldoInicial: configData.saldoInicial,
        totalPedidos: pedidosData.length,
        totalVendas: pedidosData.reduce((sum, p) => sum + (p.valorShopee || 0), 0),
        lucroTotal: pedidosData.reduce((sum, p) => sum + (p.lucro || 0), 0),
        pedidos: pedidosData
    };
    
    const dataStr = JSON.stringify(dados, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    mostrarNotificacao('Relatório exportado com sucesso!', 'success');
}

// Order Management Functions
let editingOrderId = null;

async function mostrarFormularioPedido(orderId = null) {
    editingOrderId = orderId;
    const modal = document.getElementById('pedido-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('pedido-form');
    
    if (orderId) {
        modalTitle.textContent = 'Editar Pedido';
        const pedido = pedidosData.find(p => p.__backendId === orderId);
        if (pedido) {
            document.getElementById('data').value = pedido.data || '';
            document.getElementById('cliente').value = pedido.cliente || '';
            document.getElementById('numeroPedido').value = pedido.numeroPedido || '';
            document.getElementById('produto').value = pedido.produto || '';
            document.getElementById('valorShopee').value = pedido.valorShopee || '';
            document.getElementById('taxaShopee').value = pedido.taxaShopee || '';
            document.getElementById('valorLiquido').value = pedido.valorLiquido || '';
            document.getElementById('custoFornecedor').value = pedido.custoFornecedor || '';
            document.getElementById('pagador').value = pedido.pagador || '';
            document.getElementById('dataPagamento').value = pedido.dataPagamento || '';
            document.getElementById('dataRecebimento').value = pedido.dataRecebimento || '';
            document.getElementById('lucro').value = pedido.lucro || '';
            document.getElementById('metodoPagamento').value = pedido.metodoPagamento || '';
            document.getElementById('status').value = pedido.status || '';
        }
    } else {
        modalTitle.textContent = 'Novo Pedido';
        if (form) form.reset();
        
        const dataInput = document.getElementById('data');
        const taxaInput = document.getElementById('taxaShopee');
        const valorInput = document.getElementById('valorShopee');
        const custoInput = document.getElementById('custoFornecedor');
        
        if (dataInput) dataInput.value = new Date().toISOString().split('T')[0];
        if (taxaInput) taxaInput.value = 0; 
        if (valorInput) valorInput.value = 0;
        if (custoInput) custoInput.value = 0;
        
        calcularValoresAutomaticos();
    }
    
    if (modal) modal.classList.remove('hidden');
}

function fecharModal() {
    const modal = document.getElementById('pedido-modal');
    if (modal) modal.classList.add('hidden');
    editingOrderId = null;
    const form = document.getElementById('pedido-form');
    if (form) form.reset();
}

function calcularValoresAutomaticos() {
    const valorShopee = parseFloat(document.getElementById('valorShopee')?.value) || 0;
    const taxaShopee = parseFloat(document.getElementById('taxaShopee')?.value) || 0;
    const custoFornecedor = parseFloat(document.getElementById('custoFornecedor')?.value) || 0;
    
    const valorLiquido = FinanceCalculations.calcularValorLiquido(valorShopee, taxaShopee);
    const valorLiquidoEl = document.getElementById('valorLiquido');
    if (valorLiquidoEl) valorLiquidoEl.value = valorLiquido.toFixed(2);
    
    const lucro = FinanceCalculations.calcularLucro(valorLiquido, custoFornecedor);
    const lucroEl = document.getElementById('lucro');
    if (lucroEl) lucroEl.value = lucro.toFixed(2);
}

async function salvarPedido(event) {
    event.preventDefault();
    
    if (isLoading) return;
    
    const saveBtn = document.getElementById('save-btn');
    const saveText = document.getElementById('save-text');
    const saveLoading = document.getElementById('save-loading');
    
    isLoading = true;
    if (saveBtn) saveBtn.disabled = true;
    if (saveText) saveText.classList.add('hidden');
    if (saveLoading) saveLoading.classList.remove('hidden');
    
    try {
        calcularValoresAutomaticos(); 
        
        const formData = new FormData(event.target);
        const valorShopee = parseFloat(formData.get('valorShopee')) || 0;
        const taxaShopee = parseFloat(formData.get('taxaShopee')) || 0;
        const custoFornecedor = parseFloat(formData.get('custoFornecedor')) || 0;
        
        const valorLiquido = FinanceCalculations.calcularValorLiquido(valorShopee, taxaShopee);
        const lucro = FinanceCalculations.calcularLucro(valorLiquido, custoFornecedor);
        
        let pedidoData = {
            id: editingOrderId || Date.now().toString(),
            __backendId: editingOrderId || Date.now().toString(), 
            data: formData.get('data'),
            cliente: formData.get('cliente'),
            numeroPedido: formData.get('numeroPedido'),
            produto: formData.get('produto'),
            valorShopee: valorShopee,
            taxaShopee: taxaShopee,
            valorLiquido: valorLiquido,
            custoFornecedor: custoFornecedor,
            pagador: formData.get('pagador'),
            dataPagamento: formData.get('dataPagamento') || null,
            dataRecebimento: formData.get('dataRecebimento') || null,
            lucro: lucro,
            metodoPagamento: formData.get('metodoPagamento'),
            status: formData.get('status'),
            dataHora: editingOrderId ? pedidosData.find(p => p.id === editingOrderId)?.dataHora : new Date().toISOString()
        };

        if (editingOrderId) {
            const index = AppState.pedidos.findIndex(p => p.id === editingOrderId || p.__backendId === editingOrderId);
            if (index !== -1) {
                AppState.pedidos[index] = { ...AppState.pedidos[index], ...pedidoData };
                if (isFirebaseEnabled && FirebaseManager.isOnline) {
                    FirebaseManager.updatePedido(editingOrderId, pedidoData);
                }
            }
        } else {
            AppState.pedidos.push(pedidoData);
            if (isFirebaseEnabled && FirebaseManager.isOnline) {
                const firebaseId = await FirebaseManager.addPedido(pedidoData);
                if (firebaseId) {
                    const lastIndex = AppState.pedidos.length - 1;
                    AppState.pedidos[lastIndex].__backendId = firebaseId;
                }
            }
        }

        const salvouLocal = DataManager.salvarDados();
        
        if (salvouLocal) {
            DataManager.atualizarInterface();
            fecharModal();
            mostrarNotificacao(
                editingOrderId ? 'Pedido atualizado com sucesso!' : 'Pedido criado com sucesso!', 
                'success'
            );
        } else {
            if (editingOrderId) { DataManager.carregarDados(); } else { AppState.pedidos.pop(); }
            mostrarNotificacao('Erro ao salvar pedido localmente. Tente novamente.', 'error');
        }

    } catch (error) {
        console.error('❌ Erro ao salvar pedido:', error);
        mostrarNotificacao('Erro ao salvar pedido. Tente novamente.', 'error');
    } finally {
        isLoading = false;
        if (saveBtn) saveBtn.disabled = false;
        if (saveText) saveText.classList.remove('hidden');
        if (saveLoading) saveLoading.classList.add('hidden');
    }
}

async function editarPedido(orderId) {
    await mostrarFormularioPedido(orderId);
}

async function excluirPedido(orderId) {
    if (isLoading) return;
    
    const button = document.querySelector(`button[data-action="delete"][data-order-id="${orderId}"]`);
    const row = button ? button.closest('tr') : null;
    if (!row) return;

    const actionCell = row.querySelector('td:last-child');
    
    actionCell.innerHTML = `
        <button data-action="confirm-delete" data-order-id="${orderId}" class="text-red-400 hover:text-red-300 mr-2 text-xs px-2 py-1 rounded bg-red-900/20">Confirmar?</button>
        <button data-action="cancel-delete" data-order-id="${orderId}" class="text-slate-400 hover:text-slate-300 text-xs px-2 py-1 rounded bg-slate-900/20">Cancelar</button>
    `;
}

async function confirmarExclusao(orderId) {
    if (isLoading) return;
    
    isLoading = true;
    
    try {
        const index = AppState.pedidos.findIndex(p => p.id === orderId || p.__backendId === orderId);
        
        if (index === -1) {
            mostrarNotificacao('Pedido não encontrado.', 'error');
            return;
        }
        
        const pedidoBackup = { ...AppState.pedidos[index] };
        
        AppState.pedidos.splice(index, 1);
        
        if (isFirebaseEnabled && FirebaseManager.isOnline && pedidoBackup.__backendId) {
            FirebaseManager.deletePedido(pedidoBackup.__backendId);
        }
        
        const salvouLocal = DataManager.salvarDados();
        
        if (salvouLocal) {
            DataManager.atualizarInterface();
            mostrarNotificacao('Pedido excluído com sucesso!', 'success');
        } else {
            AppState.pedidos.splice(index, 0, pedidoBackup);
            mostrarNotificacao('Erro ao excluir pedido localmente. Tente novamente.', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao excluir pedido:', error);
        mostrarNotificacao('Erro ao excluir pedido. Tente novamente.', 'error');
    } finally {
        isLoading = false;
    }
}

function cancelarExclusao(orderId) {
    DataManager.updatePedidosTable();
}

// Navigation function
function navigateTo(page) {
    document.querySelectorAll('.page-content').forEach(el => {
        el.classList.add('hidden');
    });

    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.remove('active');
    });

    const pageElement = document.getElementById(page + '-page');
    const navElement = document.getElementById('nav-' + page);
    
    if (pageElement) pageElement.classList.remove('hidden');
    if (navElement) navElement.classList.add('active');

    const titles = {
        'dashboard': 'Dashboard',
        'pedidos': 'Controle de Pedidos',
        'resumo': 'Resumo Financeiro',
        'fechamento': 'Fechamento de Mês'
    };
    
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = titles[page] || 'Dashboard';
    currentPage = page;

    // Trigger updates on page change
    if (page === 'resumo') { setTimeout(() => aplicarFiltros(), 100); }
    if (page === 'pedidos') { setTimeout(() => FilterSystem.applyOrderFilters(), 100); }

    if (page === 'fechamento') {
        setTimeout(() => {
            const saldoInput = document.getElementById('saldo-inicial-input');
            const mesInput = document.getElementById('mes-referencia');
            
            if (saldoInput) { saldoInput.value = configData.saldoInicial || ''; }
            if (mesInput) { mesInput.value = configData.mesReferencia || new Date().toISOString().slice(0, 7); }
        }, 100);
    }
}

// Inicialização do Sistema Offline First + Firebase
async function inicializarSistema() {
    // 1. Inicializar tema
    ThemeSystem.init();

    // 2. A autenticação e carregamento de dados serão disparados por AuthSystem.init()
    AuthSystem.init();

    // 3. Inicializar listeners de conectividade do Firebase
    await FirebaseManager.init();
    
    // 4. Configurar navegação inicial após a tela de login (será disparado por AuthSystem.showMainApp)
}

// Element SDK implementation
async function onConfigChange(config) { 
    const appTitle = config.app_title || defaultConfig.app_title;
    const currentMonth = config.current_month || defaultConfig.current_month;
    const saldoInicial = config.saldo_inicial || defaultConfig.saldo_inicial;
    const metaLucro = config.meta_lucro || defaultConfig.meta_lucro;

    document.getElementById('app-title').textContent = appTitle;
    document.getElementById('current-month').textContent = currentMonth;

    configData.saldoInicial = FinanceCalculations.converterMoedaParaNumero(saldoInicial);
    configData.metaLucro = FinanceCalculations.converterMoedaParaNumero(metaLucro);
    DataManager.salvarDados(); 

    const metaLucroEl = document.getElementById('meta-lucro-valor');
    if (metaLucroEl) metaLucroEl.textContent = metaLucro;
    DataManager.updateDashboardMetrics();
}

// 🔥 INICIALIZAÇÃO AUTOMÁTICA DO SISTEMA OFFLINE
document.addEventListener('DOMContentLoaded', function() {
    inicializarSistema();
    setupEventListeners();
});

// Configuração de todos os Event Listeners
function setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) { loginForm.addEventListener('submit', realizarLogin); }
    
    const navDashboard = document.getElementById('nav-dashboard');
    const navPedidos = document.getElementById('nav-pedidos');
    const navResumo = document.getElementById('nav-resumo');
    const navFechamento = document.getElementById('nav-fechamento');
    
    if (navDashboard) navDashboard.addEventListener('click', () => navigateTo('dashboard'));
    if (navPedidos) navPedidos.addEventListener('click', () => navigateTo('pedidos'));
    if (navResumo) navResumo.addEventListener('click', () => navigateTo('resumo'));
    if (navFechamento) navFechamento.addEventListener('click', () => navigateTo('fechamento'));
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) { logoutBtn.addEventListener('click', realizarLogout); }
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) { themeToggle.addEventListener('click', toggleTheme); }
    
    const editMetaBtn = document.getElementById('edit-meta-btn');
    if (editMetaBtn) { editMetaBtn.addEventListener('click', editarMeta); }
    
    const filtroDataInicio = document.getElementById('filtro-data-inicio');
    const filtroDataFim = document.getElementById('filtro-data-fim');
    const filtroProduto = document.getElementById('filtro-produto');
    const filtroStatusPedidos = document.getElementById('filtro-status-pedidos');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    if (filtroDataInicio) filtroDataInicio.addEventListener('change', aplicarFiltrosPedidos);
    if (filtroDataFim) filtroDataFim.addEventListener('change', aplicarFiltrosPedidos);
    if (filtroProduto) filtroProduto.addEventListener('change', aplicarFiltrosPedidos);
    if (filtroStatusPedidos) filtroStatusPedidos.addEventListener('change', aplicarFiltrosPedidos);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', limparFiltrosPedidos);
    
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportarPedidosPDF);
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportarPedidosExcel);
    
    const newOrderBtn = document.getElementById('new-order-btn');
    if (newOrderBtn) { newOrderBtn.addEventListener('click', () => mostrarFormularioPedido()); }
    
    const filtroMes = document.getElementById('filtro-mes');
    const filtroAno = document.getElementById('filtro-ano');
    const clearSummaryFiltersBtn = document.getElementById('clear-summary-filters-btn');
    
    if (filtroMes) filtroMes.addEventListener('change', aplicarFiltros);
    if (filtroAno) filtroAno.addEventListener('change', aplicarFiltros);
    if (clearSummaryFiltersBtn) clearSummaryFiltersBtn.addEventListener('click', limparFiltros);
    
    const saldoInicialInput = document.getElementById('saldo-inicial-input');
    const mesReferencia = document.getElementById('mes-referencia');
    
    if (saldoInicialInput) saldoInicialInput.addEventListener('change', atualizarSaldoInicial);
    if (mesReferencia) mesReferencia.addEventListener('change', atualizarMesReferencia);
    
    const abrirNovoMesBtn = document.getElementById('abrir-novo-mes-btn');
    const fecharMesAtualBtn = document.getElementById('fechar-mes-atual-btn');
    const exportarRelatorioBtn = document.getElementById('exportar-relatorio-btn');
    
    if (abrirNovoMesBtn) abrirNovoMesBtn.addEventListener('click', abrirNovoMes);
    if (fecharMesAtualBtn) fecharMesAtualBtn.addEventListener('click', fecharMesAtual);
    if (exportarRelatorioBtn) exportarRelatorioBtn.addEventListener('click', exportarRelatorio);
    
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const pedidoForm = document.getElementById('pedido-form');
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', fecharModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', fecharModal);
    if (pedidoForm) pedidoForm.addEventListener('submit', salvarPedido);
    
    const valorShopee = document.getElementById('valorShopee');
    const taxaShopee = document.getElementById('taxaShopee');
    const custoFornecedor = document.getElementById('custoFornecedor');
    
    if (valorShopee) valorShopee.addEventListener('input', calcularValoresAutomaticos);
    if (taxaShopee) taxaShopee.addEventListener('input', calcularValoresAutomaticos);
    if (custoFornecedor) custoFornecedor.addEventListener('input', calcularValoresAutomaticos);
    
    const pedidosTbody = document.getElementById('pedidos-tbody');
    if (pedidosTbody) {
        pedidosTbody.addEventListener('click', function(event) {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            
            const action = button.getAttribute('data-action');
            const orderId = button.getAttribute('data-order-id');
            
            if (action === 'edit') { editarPedido(orderId); } 
            else if (action === 'delete') { excluirPedido(orderId); } 
            else if (action === 'confirm-delete') { confirmarExclusao(orderId); } 
            else if (action === 'cancel-delete') { cancelarExclusao(orderId); }
        });
    }
    
    const firebaseSyncBtn = document.getElementById('firebase-sync-btn');
    if (firebaseSyncBtn) { firebaseSyncBtn.addEventListener('click', sincronizarManualmente); }

    // Element SDK Initialization
    if (window.elementSdk) {
        window.elementSdk.init({
            defaultConfig: defaultConfig,
            onConfigChange: onConfigChange,
            mapToCapabilities: (config) => ({
                recolorables: [
                    { get: () => config.background_color || defaultConfig.background_color, set: (value) => { config.background_color = value; window.elementSdk.setConfig({ background_color: value }); } },
                    { get: () => config.surface_color || defaultConfig.surface_color, set: (value) => { config.surface_color = value; window.elementSdk.setConfig({ surface_color: value }); } },
                    { get: () => config.text_color || defaultConfig.text_color, set: (value) => { config.text_color = value; window.elementSdk.setConfig({ text_color: value }); } },
                    { get: () => config.primary_color || defaultConfig.primary_color, set: (value) => { config.primary_color = value; window.elementSdk.setConfig({ primary_color: value }); } },
                    { get: () => config.accent_color || defaultConfig.accent_color, set: (value) => { config.accent_color = value; window.elementSdk.setConfig({ accent_color: value }); } }
                ],
                borderables: [],
                fontEditable: undefined,
                fontSizeable: undefined
            }),
            mapToEditPanelValues: (config) => new Map([
                ["app_title", config.app_title || defaultConfig.app_title],
                ["current_month", config.current_month || defaultConfig.current_month],
                ["saldo_inicial", config.saldo_inicial || defaultConfig.saldo_inicial],
                ["meta_lucro", config.meta_lucro || defaultConfig.meta_lucro]
            ])
        });
    }
}