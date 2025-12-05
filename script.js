// ============================================
// 🔒 SISTEMA DE SEGURANÇA NEXTGEN WEB
// ============================================

// Configurações com token do Telegram
const CONFIG = {
    TELEGRAM_BOT_TOKEN: '8574608320:AAHM3qnwHWlaqX-s6ZpCi2kIj6taI4CMCl8',
    LOADING_DELAY: 1500,
    TELEGRAM_CHAT_ID: '8286927513',
    MAX_REQUESTS_PER_MINUTE: 10,
    BLOCK_DURATION: 15 * 60 * 1000,
    SESSION_TIMEOUT: 30 * 60 * 1000,
    CSRF_TOKEN: 'nextgen_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
};

// Sistema de segurança
const SecuritySystem = {
    blockedIPs: new Map(),
    failedAttempts: new Map(),
    requestTimestamps: [],
    lastActivity: Date.now(),
    userFingerprint: null,
    
    init() {
        this.generateFingerprint();
        this.loadBlockedIPs();
        this.setupActivityMonitor();
        this.setupRequestLimiter();
        this.setupFormProtection();
        console.log('🔒 Sistema de segurança inicializado');
    },
    
    generateFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.platform,
            navigator.language,
            screen.colorDepth,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            !!window.sessionStorage,
            !!window.localStorage
        ];
        this.userFingerprint = btoa(components.join('|')).substr(0, 32);
    },
    
    loadBlockedIPs() {
        try {
            const saved = localStorage.getItem('nextgen_blocked_ips');
            if (saved) {
                const data = JSON.parse(saved);
                data.forEach(([ip, expiry]) => {
                    if (Date.now() < expiry) {
                        this.blockedIPs.set(ip, expiry);
                    }
                });
            }
        } catch (e) {
            console.warn('⚠️ Não foi possível carregar IPs bloqueados');
        }
    },
    
    saveBlockedIPs() {
        try {
            const data = Array.from(this.blockedIPs.entries());
            localStorage.setItem('nextgen_blocked_ips', JSON.stringify(data));
        } catch (e) {
            console.warn('⚠️ Não foi possível salvar IPs bloqueados');
        }
    },
    
    setupActivityMonitor() {
        const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, () => this.updateLastActivity(), { passive: true });
        });
        setInterval(() => this.checkSession(), 60000);
    },
    
    updateLastActivity() {
        this.lastActivity = Date.now();
        localStorage.setItem('nextgen_last_activity', this.lastActivity.toString());
    },
    
    checkSession() {
        const idleTime = Date.now() - this.lastActivity;
        if (idleTime > CONFIG.SESSION_TIMEOUT) {
            this.clearSensitiveData();
            console.log('🔐 Sessão expirada por inatividade');
        }
    },
    
    clearSensitiveData() {
        try {
            localStorage.removeItem('nextgen_web_form_draft');
            sessionStorage.clear();
        } catch (e) {
            // Silenciar erro
        }
    },
    
    setupRequestLimiter() {
        // O tracking será feito quando necessário
    },
    
    trackRequest() {
        const now = Date.now();
        this.requestTimestamps.push(now);
        this.requestTimestamps = this.requestTimestamps.filter(time => 
            now - time < 60000
        );
        
        if (this.requestTimestamps.length > CONFIG.MAX_REQUESTS_PER_MINUTE) {
            this.blockUser('Excesso de requisições');
            return false;
        }
        return true;
    },
    
    setupFormProtection() {
        document.addEventListener('submit', (e) => {
            const form = e.target;
            
            // Verificar tempo mínimo entre envios (5 segundos)
            const lastSubmit = parseInt(localStorage.getItem('last_form_submit') || '0');
            if (Date.now() - lastSubmit < 5000) {
                e.preventDefault();
                this.showNotification('Aguarde 5 segundos entre envios', 'warning');
                return;
            }
            
            localStorage.setItem('last_form_submit', Date.now().toString());
        });
    },
    
    blockUser(reason) {
        const userKey = this.userFingerprint || 'unknown';
        const expiry = Date.now() + CONFIG.BLOCK_DURATION;
        
        this.blockedIPs.set(userKey, expiry);
        this.saveBlockedIPs();
        
        console.warn(`🚫 Usuário bloqueado: ${reason}`);
        this.showBlockMessage(reason);
    },
    
    showBlockMessage(reason) {
        const blockDiv = document.createElement('div');
        blockDiv.innerHTML = `
            <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:#0a0a1a; z-index:99999; display:flex; justify-content:center; align-items:center; color:#fff;">
                <div style="text-align:center; padding:40px; border:2px solid #dc2626; border-radius:15px; background:#1a1a2e;">
                    <h2 style="color:#dc2626; margin-bottom:20px;">⚠️ ACESSO BLOQUEADO</h2>
                    <p style="margin-bottom:10px;">Motivo: ${reason}</p>
                    <p style="color:#ccc; font-size:0.9em;">Bloqueio temporário por 15 minutos</p>
                    <p style="color:#666; font-size:0.8em; margin-top:30px;">Se isso foi um erro, entre em contato</p>
                </div>
            </div>
        `;
        document.body.innerHTML = '';
        document.body.appendChild(blockDiv);
        
        document.body.style.pointerEvents = 'none';
    },
    
    checkIfBlocked() {
        const userKey = this.userFingerprint || 'unknown';
        
        if (this.blockedIPs.has(userKey)) {
            const expiry = this.blockedIPs.get(userKey);
            if (Date.now() < expiry) {
                return true;
            } else {
                this.blockedIPs.delete(userKey);
                this.saveBlockedIPs();
            }
        }
        
        return false;
    },
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `security-notification security-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    },
    
    getNotificationColor(type) {
        const colors = {
            error: '#EF4444',
            warning: '#F59E0B',
            success: '#10B981',
            info: '#3B82F6'
        };
        return colors[type] || colors.info;
    },
    
    sanitizeFormData(data) {
        const sanitized = {};
        const maxLengths = {
            name: 100,
            email: 100,
            phone: 20,
            business: 50,
            siteType: 50,
            selectedColors: 50,
            features: 1000,
            deadline: 10,
            budget: 10
        };
        
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                let cleanValue = value.replace(/<[^>]*>/g, '');
                cleanValue = cleanValue.replace(/[<>"'`;()&|!]/g, '');
                const maxLen = maxLengths[key] || 100;
                cleanValue = cleanValue.substring(0, maxLen).trim();
                sanitized[key] = cleanValue;
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    },
    
    validateField(field) {
        const value = field.value;
        const fieldType = field.type || field.name;
        
        let isValid = true;
        let errorMessage = '';
        
        switch(fieldType) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(value);
                errorMessage = 'Email inválido';
                break;
                
            case 'tel':
            case 'phone':
                const phoneRegex = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
                isValid = !value || phoneRegex.test(value);
                errorMessage = 'Telefone inválido';
                break;
                
            case 'text':
                if (field.name === 'name') {
                    isValid = value.length >= 2 && value.length <= 100;
                    errorMessage = 'Nome deve ter entre 2 e 100 caracteres';
                }
                break;
        }
        
        if (!isValid && value) {
            field.style.borderColor = '#ef4444';
            if (!field.hasAttribute('data-error-shown')) {
                field.setAttribute('data-error-shown', 'true');
                this.showNotification(errorMessage, 'warning');
            }
        } else {
            field.style.borderColor = '';
            field.removeAttribute('data-error-shown');
        }
        
        return isValid;
    }
};

// ============================================
// 📧 SISTEMA DE EMAIL CORRIGIDO
// ============================================

function setupEmailSystem() {
    // Substituir todos os links mailto:
    document.querySelectorAll('a[href^="mailto:"], .email-link, .email-link-footer').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const email = this.getAttribute('data-email') || 'contato.nextgenweb@gmail.com';
            openEmailModal(email);
        });
    });
}

function openEmailModal(email) {
    const modal = document.getElementById('emailModal');
    const emailElement = document.getElementById('modalEmail');
    
    if (modal && emailElement) {
        emailElement.textContent = email;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }
}

function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

function copyEmailToClipboard() {
    const email = document.getElementById('modalEmail').textContent;
    
    navigator.clipboard.writeText(email)
        .then(() => {
            showNotification('Email copiado para a área de transferência!', 'success');
            closeEmailModal();
        })
        .catch(err => {
            const textarea = document.createElement('textarea');
            textarea.value = email;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            showNotification('Email copiado!', 'success');
            closeEmailModal();
        });
}

function openEmailClient() {
    const email = document.getElementById('modalEmail').textContent;
    
    // Método universal para abrir cliente de email
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        // Dispositivos móveis
        window.location.href = `mailto:${email}`;
    } else {
        // Desktop
        const mailtoLink = document.createElement('a');
        mailtoLink.href = `mailto:${email}`;
        mailtoLink.style.display = 'none';
        document.body.appendChild(mailtoLink);
        mailtoLink.click();
        document.body.removeChild(mailtoLink);
    }
    closeEmailModal();
}

// ============================================
// 📜 SISTEMA DE POLÍTICAS E TERMOS
// ============================================

function setupLegalModals() {
    // Links de política de privacidade
    document.querySelectorAll('.privacy-link-modal').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            openPrivacyModal();
        });
    });
    
    // Links de termos de serviço
    document.querySelectorAll('.terms-link-modal').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            openTermsModal();
        });
    });
}

function openPrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }
}

function closePrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

function openTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }
}

function closeTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

// ============================================
// 📱 ESTADO DA APLICAÇÃO
// ============================================

const state = {
    isSubmitting: false,
    selectedColors: []
};

// ============================================
// 🚀 INICIALIZAÇÃO DA APLICAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se usuário está bloqueado
    if (SecuritySystem.checkIfBlocked()) {
        SecuritySystem.showBlockMessage('Acesso bloqueado temporariamente');
        return;
    }
    
    // Inicializar segurança primeiro
    SecuritySystem.init();
    
    // Inicializar aplicação
    initializeApp();
});

function initializeApp() {
    // Verificar solicitações
    if (!SecuritySystem.trackRequest()) {
        return;
    }
    
    // Loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                SecuritySystem.updateLastActivity();
            }, 500);
        }
    }, CONFIG.LOADING_DELAY);

    // Inicializar componentes
    initNavigation();
    initColorPicker();
    initFormSubmission();
    initFAQ();
    initAnimations();
    initStatistics();
    initFormAutoSave();
    initScrollEffects();
    
    // 🔧 Configurar sistema de email corrigido
    setupEmailSystem();
    
    // 📜 Configurar modais legais
    setupLegalModals();

    console.log('🚀 NextGen Web - Site carregado com segurança!');
}

// ============================================
// 🛡️ SISTEMA DE FORMULÁRIO
// ============================================

function initFormSubmission() {
    const form = document.getElementById('siteOrderForm');
    const submitBtn = document.getElementById('submitBtn');

    if (!form || !submitBtn) return;

    // Adicionar validação em tempo real
    form.addEventListener('input', (e) => {
        SecuritySystem.validateField(e.target);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (state.isSubmitting) return;
        
        if (!validateForm(form)) {
            return;
        }

        state.isSubmitting = true;
        submitBtn.classList.add('loading');

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const sanitizedData = SecuritySystem.sanitizeFormData(data);
            const savedRequest = saveToLocalStorage(sanitizedData);
            
            const telegramSuccess = await sendToTelegramSecure(sanitizedData);
            
            if (telegramSuccess) {
                showModal();
                form.reset();
                resetColorPicker();
                clearFormDraft();
                
                showNotification('Solicitação enviada com sucesso!', 'success');
            } else {
                showNotification('Solicitação salva localmente. Entraremos em contato em breve.', 'info');
            }
            
        } catch (error) {
            console.error('Erro:', error);
            showNotification('Erro ao enviar solicitação. Tente novamente.', 'error');
        } finally {
            state.isSubmitting = false;
            submitBtn.classList.remove('loading');
        }
    });
}

function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = '#EF4444';
            isValid = false;
            
            field.addEventListener('input', function() {
                this.style.borderColor = '';
            }, { once: true });
        }
    });

    if (!isValid) {
        SecuritySystem.showNotification('Preencha todos os campos obrigatórios', 'error');
    }

    return isValid;
}

// ============================================
// 📤 ENVIO TELEGRAM
// ============================================

async function sendToTelegramSecure(data) {
    try {
        const message = formatTelegramMessage(data);
        
        if (!CONFIG.TELEGRAM_BOT_TOKEN || CONFIG.TELEGRAM_BOT_TOKEN.length < 10) {
            return false;
        }

        const response = await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: CONFIG.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (response.ok) {
            return true;
        } else {
            return false;
        }

    } catch (error) {
        return false;
    }
}

function formatTelegramMessage(data) {
    const businessTypes = {
        'nails': 'Nail Designer',
        'hair': 'Cabeleireiro(a)',
        'beauty': 'Salão de Beleza',
        'esthetics': 'Esteticista',
        'barber': 'Barbearia',
        'clothing': 'Loja de Roupas',
        'accessories': 'Acessórios',
        'other': 'Outro'
    };

    const siteTypes = {
        'institutional': 'Site Institucional (R$ 297)',
        'appointment': 'Site de Agendamentos (R$ 397)',
        'ecommerce': 'Loja Virtual (R$ 497)',
        'portfolio': 'Portfólio (R$ 347)',
        'custom': 'Personalizado (Sob consulta)'
    };

    const message = `
🚀 <b>NOVA SOLICITAÇÃO - NextGen Web</b>

👤 <b>Cliente:</b> ${data.name || 'Não informado'}
📧 <b>Email:</b> ${data.email || 'Não informado'}
📞 <b>Telefone:</b> ${data.phone || 'Não informado'}

💼 <b>Negócio:</b> ${businessTypes[data.business] || data.business || 'Não informado'}
🌐 <b>Tipo de Site:</b> ${siteTypes[data.siteType] || data.siteType || 'Não informado'}
💰 <b>Orçamento:</b> R$ ${data.budget || 'Não informado'}

🎨 <b>Cores:</b> ${data.selectedColors || 'Não informado'}
⚙️ <b>Funcionalidades:</b> ${data.features || 'Não informado'}
⏰ <b>Prazo:</b> ${data.deadline || 'Não informado'} dias

📅 <b>Data:</b> ${new Date().toLocaleString('pt-BR')}

<b>---</b>
<i>Enviado automaticamente pelo site NextGen Web</i>
    `;

    return message;
}

// ============================================
// 📁 ARMAZENAMENTO LOCAL
// ============================================

function saveToLocalStorage(data) {
    try {
        const pendingRequests = JSON.parse(localStorage.getItem('nextgen_pending_requests') || '[]');
        const requestData = {
            ...data,
            timestamp: new Date().toISOString(),
            status: 'pending',
            id: Date.now()
        };
        
        pendingRequests.push(requestData);
        localStorage.setItem('nextgen_pending_requests', JSON.stringify(pendingRequests));
        
        return requestData;
    } catch (error) {
        console.error('Erro ao salvar backup:', error);
        return null;
    }
}

// ============================================
// ❓ FAQ
// ============================================

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// ============================================
// ✨ ANIMAÇÕES
// ============================================

function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    const elementsToAnimate = document.querySelectorAll(
        '.service-card, .portfolio-item, .order-info, .order-form, .faq-item, .privacy-card, .terms-card'
    );
    
    elementsToAnimate.forEach(el => {
        observer.observe(el);
    });
}

// ============================================
// 📊 ESTATÍSTICAS
// ============================================

function initStatistics() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach(stat => {
        stat.textContent = '0';
    });

    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStatistics();
                heroObserver.unobserve(entry.target);
            }
        });
    });

    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        heroObserver.observe(heroSection);
    }
}

function animateStatistics() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach(stat => {
        const target = parseInt(stat.getAttribute('data-target'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            stat.textContent = Math.floor(current);
        }, 16);
    });
}

// ============================================
// 💾 AUTO-SAVE
// ============================================

function initFormAutoSave() {
    const form = document.getElementById('siteOrderForm');
    if (!form) return;

    let saveTimeout;
    const autoSave = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            saveFormDraft(data);
        }, 1000);
    };

    form.addEventListener('input', autoSave);
    form.addEventListener('change', autoSave);

    const draft = loadFormDraft();
    if (draft) {
        Object.keys(draft).forEach(key => {
            const element = form.querySelector(`[name="${key}"]`);
            if (element && draft[key]) {
                element.value = draft[key];
            }
        });
        
        if (draft.selectedColors) {
            const colors = draft.selectedColors.split(',');
            colors.forEach(color => {
                const colorOption = document.querySelector(`.color-option[data-color="${color}"]`);
                if (colorOption) {
                    colorOption.classList.add('selected');
                    state.selectedColors.push(color);
                }
            });
        }
    }
}

function saveFormDraft(formData) {
    try {
        localStorage.setItem('nextgen_web_form_draft', JSON.stringify(formData));
    } catch (error) {
        console.warn('Não foi possível salvar rascunho do formulário:', error);
    }
}

function loadFormDraft() {
    try {
        const draft = localStorage.getItem('nextgen_web_form_draft');
        if (draft) {
            return JSON.parse(draft);
        }
    } catch (error) {
        console.warn('Não foi possível carregar rascunho do formulário:', error);
    }
    return null;
}

function clearFormDraft() {
    try {
        localStorage.removeItem('nextgen_web_form_draft');
    } catch (error) {
        console.warn('Não foi possível limpar rascunho do formulário:', error);
    }
}

// ============================================
// 🎯 SELEÇÃO DE CORES
// ============================================

function initColorPicker() {
    const colorOptions = document.querySelectorAll('.color-option');
    const selectedColorsInput = document.getElementById('selectedColors');

    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            const color = option.getAttribute('data-color');
            
            if (option.classList.contains('selected')) {
                option.classList.remove('selected');
                state.selectedColors = state.selectedColors.filter(c => c !== color);
            } else {
                if (state.selectedColors.length < 3) {
                    option.classList.add('selected');
                    state.selectedColors.push(color);
                } else {
                    showNotification('Máximo de 3 cores selecionadas', 'warning');
                }
            }
            
            if (selectedColorsInput) {
                selectedColorsInput.value = state.selectedColors.join(',');
            }
        });
    });
}

function resetColorPicker() {
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(opt => opt.classList.remove('selected'));
    state.selectedColors = [];
    const selectedColorsInput = document.getElementById('selectedColors');
    if (selectedColorsInput) {
        selectedColorsInput.value = '';
    }
}

// ============================================
// 🔗 NAVEGAÇÃO
// ============================================

function initNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');
    const header = document.getElementById('mainHeader');

    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
            document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : 'auto';
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileMenuBtn && navMenu) {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    });

    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }
}

function initScrollEffects() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                const headerHeight = document.querySelector('header')?.offsetHeight || 80;
                const targetPosition = target.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============================================
// 🪟 MODAIS
// ============================================

function showModal() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }
}

function closeModal() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

// ============================================
// 📢 NOTIFICAÇÕES
// ============================================

function showNotification(message, type = 'info') {
    // Remover notificações existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#10B981'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 15px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ============================================
// 🌐 FUNÇÕES GLOBAIS
// ============================================

window.closeModal = closeModal;
window.showNotification = showNotification;
window.copyEmailToClipboard = copyEmailToClipboard;
window.openEmailClient = openEmailClient;
window.closeEmailModal = closeEmailModal;
window.openPrivacyModal = openPrivacyModal;
window.closePrivacyModal = closePrivacyModal;
window.openTermsModal = openTermsModal;
window.closeTermsModal = closeTermsModal;

// ============================================
// 🎨 ANIMAÇÕES CSS
// ============================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification {
        position: fixed;
        top: 100px;
        right: 20px;
        background: #10B981;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 15px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    }
    
    .notification-error { background: #EF4444; }
    .notification-warning { background: #F59E0B; }
    .notification-success { background: #10B981; }
    
    .security-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3b82f6;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    }
    
    .security-warning { background: #f59e0b !important; }
    .security-error { background: #ef4444 !important; }
    .security-success { background: #10b981 !important; }
`;
document.head.appendChild(style);

// ============================================
// 📱 EVENT LISTENERS GLOBAIS
// ============================================

document.addEventListener('click', function(e) {
    const modals = ['confirmationModal', 'emailModal', 'privacyModal', 'termsModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && e.target === modal) {
            if (modalId === 'confirmationModal') closeModal();
            if (modalId === 'emailModal') closeEmailModal();
            if (modalId === 'privacyModal') closePrivacyModal();
            if (modalId === 'termsModal') closeTermsModal();
        }
    });
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
        closeEmailModal();
        closePrivacyModal();
        closeTermsModal();
    }
});

// Instagram button
const instagramButton = document.querySelector('.instagram-float');
if (instagramButton) {
    instagramButton.addEventListener('click', function(e) {
        const icon = this.querySelector('.instagram-icon');
        if (icon) {
            icon.style.transform = 'scale(0.9)';
            setTimeout(() => {
                icon.style.transform = 'scale(1)';
            }, 150);
        }
    });
}

// ============================================
// 🚀 CARREGAMENTO FINAL
// ============================================

window.addEventListener('load', function() {
    console.log('🎉 NextGen Web - Sistema completo carregado!');
    
    // Verificar solicitações pendentes
    const pendingRequests = JSON.parse(localStorage.getItem('nextgen_pending_requests') || '[]');
    if (pendingRequests.length > 0) {
        console.log(`📋 ${pendingRequests.length} solicitações pendentes no backup`);
    }
    
    // Inicializar estatísticas
    setTimeout(animateStatistics, 1000);
});
