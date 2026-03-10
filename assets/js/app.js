document.addEventListener("DOMContentLoaded", () => {
    const CSV_URL = 'notifications.csv';
    const notifList = document.getElementById('notifList');
    const searchInput = document.getElementById('searchInput');
    const reloadBtn = document.getElementById('reloadBtn');
    const tagsRow = document.getElementById('tagsRow');
    const resultsCount = document.getElementById('resultsCount');

    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitleEl = document.getElementById('modalTitleEl');
    const modalContentEl = document.getElementById('modalContentEl');
    const modalMetaRow = document.getElementById('modalMetaRow');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCloseBotBtn = document.getElementById('modalCloseBotBtn');

    let notifications = [];
    let currentTag = 'all';

    function parseCSV(text) {
        const rows = [];
        let curVal = '';
        let inQuotes = false;
        let row = [];
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                if (inQuotes && text[i + 1] === '"') {
                    curVal += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(curVal.trim());
                curVal = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && text[i + 1] === '\n') i++;
                row.push(curVal.trim());
                if (row.some(x => x !== '')) rows.push(row);
                row = [];
                curVal = '';
            } else {
                curVal += char;
            }
        }
        if (curVal !== '' || row.length > 0) {
            row.push(curVal.trim());
            if (row.some(x => x !== '')) rows.push(row);
        }
        return rows;
    }

    function isNew(dateStr) {
        if (!dateStr) return false;
        const notifDate = new Date(dateStr);
        if (isNaN(notifDate.getTime())) return false;
        const today = new Date();
        const diffDays = Math.floor((today - notifDate) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    }

    // Format YYYY-MM-DD to DD/MM/YYYY for UI
    function formatDate(dateStr) {
        if(!dateStr) return '--/--/----';
        const parts = dateStr.split('-');
        if(parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    }

    async function loadData() {
        notifList.innerHTML = `
            <div class="state-box">
                <div class="loading-spinner mb-4"></div>
                <div class="state-text">Đang đồng bộ dữ liệu...</div>
            </div>`;
        try {
            const response = await fetch(`${CSV_URL}?nocache=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            
            const rows = parseCSV(text);
            if (rows.length < 2) {
                renderEmpty('Không có dữ liệu trong file CSV.');
                return;
            }

            const headers = rows[0];
            notifications = rows.slice(1).map((cols, index) => {
                const obj = { id: index };
                headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
                obj.isNew = isNew(obj['Ngay']);
                return obj;
            });

            // Sort by Date descending
            notifications.sort((a, b) => {
                const dateA = new Date(a['Ngay'] || 0);
                const dateB = new Date(b['Ngay'] || 0);
                return dateB - dateA;
            });
            
            renderTags();
            filterAndRender();

        } catch (error) {
            console.error('Error fetching CSV:', error);
            renderEmpty(`Lỗi tải dữ liệu: ${error.message}`);
        }
    }

    function renderEmpty(msg = 'Không tìm thấy thông báo nào tring hệ thống.') {
        notifList.innerHTML = `
            <div class="state-box">
                <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <div class="state-text">${msg}</div>
            </div>`;
        resultsCount.textContent = 'Trống';
    }

    function getTagBadgeClass(tag) {
        if (!tag) return 'badge-default';
        const t = tag.toLowerCase();
        if (t.includes('học bổng')) return 'badge-warning';
        if (t.includes('sự kiện')) return 'badge-success';
        if (t.includes('đào tạo')) return 'badge-purple';
        return 'badge-default';
    }

    function renderTags() {
        const tagCounts = { 'all': notifications.length };
        notifications.forEach(n => {
            const tag = n['Tag'] || 'Khác';
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });

        let tagsHtml = `
            <button class="tag-btn ${currentTag === 'all' ? 'active' : ''}" data-tag="all">
                Tất cả <span class="tag-count">${tagCounts['all']}</span>
            </button>`;
        
        Object.keys(tagCounts).forEach(tag => {
            if (tag === 'all') return;
            const isActive = currentTag === tag ? 'active' : '';
            tagsHtml += `
            <button class="tag-btn ${isActive}" data-tag="${tag}">
                ${tag} <span class="tag-count">${tagCounts[tag]}</span>
            </button>`;
        });
        
        tagsRow.innerHTML = tagsHtml;

        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentTag = e.currentTarget.getAttribute('data-tag');
                renderTags();
                filterAndRender();
            });
        });
    }

    function filterAndRender() {
        const query = searchInput.value.toLowerCase().trim();
        const filtered = notifications.filter(n => {
            const matchQuery = (n['TieuDe'] && n['TieuDe'].toLowerCase().includes(query)) || 
                               (n['NoiDung'] && n['NoiDung'].toLowerCase().includes(query));
            const matchTag = currentTag === 'all' || (n['Tag'] && n['Tag'] === currentTag);
            return matchQuery && matchTag;
        });

        if (filtered.length === 0) {
            renderEmpty();
            return;
        }

        resultsCount.innerHTML = `Đang hiển thị <strong>${filtered.length}</strong> thông báo`;

        notifList.innerHTML = filtered.map((n, i) => `
            <article class="noti-card" onclick="openModal(${n.id})" style="animation: slideUp 0.4s ease-out ${i * 0.05}s both;">
                 <div class="noti-meta">
                     <span class="badge ${getTagBadgeClass(n['Tag'])}">${n['Tag'] || 'Khác'}</span>
                     ${n.isNew ? '<span class="badge badge-new"><svg viewBox="0 0 24 24" fill="currentColor" class="icon-sm" style="margin-right:2px; vertical-align:text-bottom"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>MỚI</span>' : ''}
                     <span class="badge badge-date">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="icon-sm">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${formatDate(n['Ngay'])}
                     </span>
                 </div>
                 <h3 class="noti-title">${n['TieuDe']}</h3>
                 <p class="noti-desc">${n['NoiDung']}</p>
                 <div class="noti-footer">
                     <span class="view-more">
                        Xem chi tiết 
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="width:14px;height:14px"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                     </span>
                 </div>
            </article>`).join('');
    }

    // Modal Handle
    window.openModal = function(id) {
        const n = notifications.find(x => x.id === id);
        if (!n) return;
        
        modalMetaRow.innerHTML = `
            <span class="badge" style="background: rgba(255,255,255,0.2); color:white; border: 1px solid rgba(255,255,255,0.3); backdrop-filter: blur(4px);">
                ${n['Tag'] || 'Khác'}
            </span>
            ${n.isNew ? '<span class="badge badge-new" style="background: #ef4444; color:white; border-color: #f87171;">MỚI</span>' : ''}
            <span class="badge" style="background: rgba(0,0,0,0.25); color:white; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(4px);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm" style="margin-right:6px"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                ${formatDate(n['Ngay'])}
            </span>
        `;
        
        modalTitleEl.textContent = n['TieuDe'];
        // Replace newlines with <br> and wrap logic
        const rawContent = n['NoiDung'] || '';
        const normContent = rawContent.replace(/\\n/g, '\n'); 
        const contentHtml = normContent.split('\n').map(p => p.trim()).filter(Boolean).map(p => `<p>${p}</p>`).join('');
        modalContentEl.innerHTML = contentHtml || '<p>Không có nội dung</p>';
  
        modalOverlay.style.display = 'flex';
        void modalOverlay.offsetWidth; // force reflow
        modalOverlay.classList.add('show');
        document.body.style.overflow = 'hidden'; 
    };

    function closeModal() {
        modalOverlay.classList.remove('show');
        setTimeout(() => {
            modalOverlay.style.display = 'none';
            document.body.style.overflow = ''; 
        }, 300); // match css transition
    }
  
    // Listeners
    searchInput.addEventListener('input', filterAndRender);
    reloadBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentTag = 'all';
        loadData();
    });
  
    modalCloseBtn.addEventListener('click', closeModal);
    modalCloseBotBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('show')) closeModal();
    });
  
    // Inject custom animation styles for cards
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    // Initial Load
    loadData();
});
