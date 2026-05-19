var startCardsData = [];
var submissionCardsData = [];
var currentCardData = null;

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(function(tab) { tab.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(btn) { btn.classList.remove('active'); });
    document.getElementById(tabId).classList.add('active');
    var buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(function(btn) {
        if (btn.getAttribute('onclick') === "switchTab('" + tabId + "')") {
            btn.classList.add('active');
        }
    });

    var isCardTab = (tabId === 'tab3' || tabId === 'tab4');
    var trigger = document.getElementById('filter-trigger');
    trigger.style.display = isCardTab ? '' : 'none';

    if (!isCardTab && filterOpen) {
        closeFilter();
    }
    if (isCardTab && filterOpen) {
        applyFilter();
    }
}

function extractFilename(path) {
    var parts = path.split('/');
    var name = parts[parts.length - 1];
    name = name.replace(/\.json$/i, '');
    name = name.replace(/^(s|sub)\d+-/, '');
    return name;
}

async function loadCards(fileList) {
    var results = await Promise.all(
        fileList.map(function(path) {
            return fetch(path)
                .then(function(resp) { return resp.json(); })
                .then(function(data) {
                    data._filename = extractFilename(path);
                    return data;
                })
                .catch(function(e) {
                    console.error('加载开局文件失败:', path, e);
                    return null;
                });
        })
    );
    return results.filter(function(c) { return c !== null; });
}

function renderStartCards(containerId, dataArray) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var html = '';
    dataArray.forEach(function(card) {
        var bgClass = card.color ? 'card-bg-' + card.color : 'card-bg-soft-green';
        var imgClass = card.image ? ' has-image' : '';
        html += '<div class="start-card ' + bgClass + imgClass + '" data-id="' + card.id + '">';

        html += '<div class="card-filename">' + escapeHtml(card._filename) + '</div>';

        if (card.image) {
            html += '<div class="card-image"><img src="' + escapeHtml(card.image) + '" alt="" loading="lazy"></div>';
        }

        if (card.tags && card.tags.length > 0) {
            html += '<div class="card-tags">';
            card.tags.forEach(function(tag) {
                html += '<span class="card-tag">#' + escapeHtml(tag) + '</span>';
            });
            html += '</div>';
        } else {
            html += '<div class="card-tags"></div>';
        }

        html += '</div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.start-card').forEach(function(cardEl) {
        cardEl.addEventListener('click', function() {
            var cardId = parseInt(this.getAttribute('data-id'));
            var foundCard = dataArray.find(function(c) { return c.id === cardId; });
            if (foundCard) {
                openModal(foundCard);
            }
        });
    });
}

function openModal(cardData) {
    currentCardData = cardData;

    document.getElementById('modal-title').textContent = cardData._filename || '未命名';

    var authorEl = document.getElementById('modal-author');
    if (cardData.author) {
        authorEl.textContent = '✎ ' + cardData.author;
        authorEl.style.display = 'inline';
    } else {
        authorEl.style.display = 'none';
    }

    var timeEl = document.getElementById('modal-time');
    if (cardData.time) {
        timeEl.textContent = cardData.time;
        timeEl.style.display = 'inline';
    } else {
        timeEl.style.display = 'none';
    }

    var tagsContainer = document.getElementById('modal-tags');
    if (cardData.tags && cardData.tags.length > 0) {
        tagsContainer.innerHTML = cardData.tags.map(function(tag) {
            return '<span class="modal-tag">#' + escapeHtml(tag) + '</span>';
        }).join('');
        tagsContainer.style.display = 'flex';
    } else {
        tagsContainer.innerHTML = '';
        tagsContainer.style.display = 'none';
    }

    var previewEl = document.getElementById('modal-preview');
    previewEl.textContent = cardData.content || '暂无内容';

    document.getElementById('start-modal').classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function openViewStartModal() {
    if (!currentCardData) return;

    document.getElementById('view-modal-title').textContent = currentCardData._filename || '未命名';
    document.getElementById('view-full-content').textContent = currentCardData.content || '暂无内容';

    document.getElementById('view-start-modal').classList.add('show');
}

function sendStartContent() {
    if (!currentCardData) return;

    var rawContent = currentCardData.content_raw || currentCardData.content || '';
    var sendText = rawContent;

    if (typeof triggerSlash !== 'undefined') {
        triggerSlash('/sendas name="花园巡防官" ' + sendText);
    } else {
        console.log('发送开局内容:', sendText);
        alert('已尝试以花园巡防官名称发送开局内容。\n\n内容（前50字）：' + rawContent.substring(0, 50) + '...');
    }
}

function loadStart() {
    sendStartContent();
}

function loadStartFromView() {
    sendStartContent();
    closeModal('view-start-modal');
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function setColumns(n) {
    document.querySelectorAll('.card-grid').forEach(function(grid) {
        grid.style.columnCount = n;
    });
    localStorage.setItem('garden-columns', n);
    document.querySelectorAll('.col-btn').forEach(function(btn) {
        btn.classList.remove('active');
        if (parseInt(btn.textContent) === n) {
            btn.classList.add('active');
        }
    });
}

function initSettings() {
    var saved = parseInt(localStorage.getItem('garden-columns'));
    if (saved >= 1 && saved <= 5) {
        setColumns(saved);
    }
    var savedSizeUI = parseInt(localStorage.getItem('garden-fontsize-ui'));
    if (savedSizeUI) {
        setFontSizeUI(savedSizeUI);
    }
    var savedSizeCards = parseInt(localStorage.getItem('garden-fontsize-cards'));
    if (savedSizeCards) {
        setFontSizeCards(savedSizeCards);
    }
    var savedFont = localStorage.getItem('garden-font');
    if (savedFont) {
        setFontFamily(savedFont);
    }
}

var FONT_MAP = {
    kuaile: "'ZCOOL KuaiLe', cursive",
    serif: "'Noto Serif SC', serif",
    sans: "'Noto Sans SC', sans-serif",
    mashan: "'Ma Shan Zheng', cursive"
};

var currentFilterTag = null;
var filterOpen = false;

function toggleFilter() {
    filterOpen = !filterOpen;
    var panel = document.getElementById('filter-panel');
    var trigger = document.getElementById('filter-trigger');
    if (filterOpen) {
        panel.classList.add('show');
        trigger.classList.add('active');
        buildTagCloud();
        applyFilter();
    } else {
        closeFilter();
    }
}

function closeFilter() {
    filterOpen = false;
    document.getElementById('filter-panel').classList.remove('show');
    document.getElementById('filter-trigger').classList.remove('active');
    currentFilterTag = null;
    document.getElementById('filter-search').value = '';
    resetAllCards();
}

function buildTagCloud() {
    var allCards = startCardsData.concat(submissionCardsData);
    var tagMap = {};
    allCards.forEach(function(card) {
        if (card.tags && card.tags.length > 0) {
            card.tags.forEach(function(tag) {
                tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
        }
    });
    var sorted = Object.keys(tagMap).sort(function(a, b) { return tagMap[b] - tagMap[a]; });

    var container = document.getElementById('filter-tags');
    var html = '';
    sorted.forEach(function(tag) {
        var active = (currentFilterTag === tag) ? ' active' : '';
        html += '<span class="filter-tag-badge' + active + '" onclick="selectTag(\'' + escapeHtml(tag) + '\')">#' + escapeHtml(tag) + '<span class="tag-count">' + tagMap[tag] + '</span></span>';
    });
    container.innerHTML = html;
}

function selectTag(tag) {
    if (currentFilterTag === tag) {
        currentFilterTag = null;
    } else {
        currentFilterTag = tag;
    }
    buildTagCloud();
    applyFilter();
}

function getActiveTabCards() {
    var activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'tab3') return startCardsData;
    if (activeTab && activeTab.id === 'tab4') return submissionCardsData;
    return [];
}

function getActiveContainerId() {
    var activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'tab3') return 'start-cards-grid';
    if (activeTab && activeTab.id === 'tab4') return 'submission-cards-grid';
    return null;
}

function applyFilter() {
    if (!filterOpen) return;
    var searchText = document.getElementById('filter-search').value.toLowerCase();
    var dataArray = getActiveTabCards();
    var containerId = getActiveContainerId();
    if (!containerId || !dataArray.length) return;

    var filtered = dataArray.filter(function(card) {
        var matchTag = !currentFilterTag || (card.tags && card.tags.indexOf(currentFilterTag) >= 0);
        var matchSearch = !searchText ||
            (card._filename && card._filename.toLowerCase().indexOf(searchText) >= 0) ||
            (card.content && card.content.toLowerCase().indexOf(searchText) >= 0);
        return matchTag && matchSearch;
    });

    renderStartCards(containerId, filtered);
}

function resetAllCards() {
    renderStartCards('start-cards-grid', startCardsData);
    renderStartCards('submission-cards-grid', submissionCardsData);
}

function setFontSizeUI(n) {
    document.body.style.setProperty('--font-size-base', n + 'px');
    localStorage.setItem('garden-fontsize-ui', n);
    var sizeIdx = { 12: 0, 16: 1, 20: 2, 24: 3 };
    var btns = document.querySelectorAll('.settings-row:nth-of-type(2) .col-btn');
    btns.forEach(function(btn, i) {
        btn.classList.toggle('active', i === sizeIdx[n]);
    });
}

function setFontSizeCards(n) {
    document.body.style.setProperty('--font-size-cards', n + 'px');
    localStorage.setItem('garden-fontsize-cards', n);
    var sizeIdx = { 12: 0, 14: 1, 18: 2, 22: 3 };
    var btns = document.querySelectorAll('.settings-row:nth-of-type(3) .col-btn');
    btns.forEach(function(btn, i) {
        btn.classList.toggle('active', i === sizeIdx[n]);
    });
}

function setFontFamily(key) {
    var font = FONT_MAP[key] || FONT_MAP.kuaile;
    document.body.style.setProperty('--font-main', font);
    localStorage.setItem('garden-font', key);
    document.querySelectorAll('.font-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    var btn = document.querySelector('.font-btn[onclick*=\"' + key + '\"]');
    if (btn) btn.classList.add('active');
}

async function loadPreface() {
    var el = document.getElementById('preface-content');
    try {
        var resp = await fetch('data/preface.html');
        if (resp.ok) {
            var text = await resp.text();
            if (text.trim()) {
                el.innerHTML = text;
                return;
            }
        }
    } catch (e) {
        console.error('加载前言失败:', e);
    }
    el.innerHTML = '<h3>📖 前言</h3><p>加载失败，请检查文件。</p>';
}

async function loadHistory() {
    var historyEl = document.getElementById('history-content');
    try {
        var resp = await fetch('data/history.html');
        if (resp.ok) {
            var text = await resp.text();
            if (text.trim()) {
                historyEl.innerHTML = text;
                historyEl.classList.remove('history-placeholder');
                historyEl.classList.add('history-content');
                return;
            }
        }
    } catch (e) {
        console.error('加载花园历史失败:', e);
    }
    historyEl.textContent = '📝 此处填写花园历史，稍后填入';
}

document.addEventListener('DOMContentLoaded', async function() {
    startCardsData = await loadCards(START_CARDS_FILES);
    submissionCardsData = await loadCards(SUBMISSION_CARDS_FILES);
    renderStartCards('start-cards-grid', startCardsData);
    renderStartCards('submission-cards-grid', submissionCardsData);
    loadPreface();
    loadHistory();
    initSettings();
});

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target.id);
    }
});
