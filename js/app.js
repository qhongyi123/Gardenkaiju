var startCardsData = [];
var submissionCardsData = [];
var characterCardsData = [];
var characterMap = {};
var currentCardData = null;
var bindWorldbook = true;

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

    var isCardTab = (tabId === 'tab3' || tabId === 'tab4' || tabId === 'tab6');
    var trigger = document.getElementById('filter-trigger');
    trigger.style.display = isCardTab ? '' : 'none';

    if (!isCardTab && filterOpen) {
        closeFilter();
    }
    if (isCardTab) {
        if (tabId === 'tab3') {
            updateFavToggleCount('starts');
            if (favModeStarts) refreshCurrentCards();
        } else if (tabId === 'tab4') {
            updateFavToggleCount('subs');
            if (favModeSubs) refreshCurrentCards();
        } else {
            updateFavToggleCount('chars');
            if (favModeChars) refreshCurrentCards();
        }
        if (filterOpen) {
            document.getElementById('filter-search').value = filterSearches[tabId] || '';
            buildTagCloud();
            applyFilter();
        }
    }
}

function extractFilename(path) {
    var parts = path.split('/');
    var name = parts[parts.length - 1];
    name = name.replace(/\.json$/i, '');
    if (/^[a-z]+\d+-/.test(name)) {
        name = name.replace(/^[a-z]+\d+-/, '');
    }
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
                if (containerId === 'character-cards-grid') {
                    openCharacterModal(foundCard);
                } else {
                    openModal(foundCard);
                }
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

    var charLink = document.getElementById('modal-character-link');
    var charName = document.getElementById('modal-character-name');
    var wbRow = document.getElementById('modal-worldbook-row');
    if (cardData.character && characterMap[cardData.character]) {
        charLink.style.display = '';
        charName.textContent = cardData.character;
        var ch = characterMap[cardData.character];
        if (ch.worldbook) {
            wbRow.style.display = '';
            document.getElementById('modal-bind-worldbook').checked = bindWorldbook;
        } else {
            wbRow.style.display = 'none';
        }
    } else {
        charLink.style.display = 'none';
        wbRow.style.display = 'none';
    }

    document.getElementById('start-modal').classList.add('show');
    updateFavButton();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function openCharacterModal(cardData) {
    currentCardData = cardData;

    document.getElementById('character-modal-title').textContent = cardData._filename || '未命名';

    var authorEl = document.getElementById('character-modal-author');
    if (cardData.author) {
        authorEl.textContent = '✎ ' + cardData.author;
        authorEl.style.display = 'inline';
    } else {
        authorEl.style.display = 'none';
    }

    var tagsContainer = document.getElementById('character-modal-tags');
    if (cardData.tags && cardData.tags.length > 0) {
        tagsContainer.innerHTML = cardData.tags.map(function(tag) {
            return '<span class="modal-tag">#' + escapeHtml(tag) + '</span>';
        }).join('');
        tagsContainer.style.display = 'flex';
    } else {
        tagsContainer.innerHTML = '';
        tagsContainer.style.display = 'none';
    }

    document.getElementById('character-modal-preview').textContent = cardData.content || '暂无简介';

    document.getElementById('character-modal').classList.add('show');
    updateCharacterFavButton();
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

function bindWorldbookIfNeeded() {
    if (!currentCardData || !currentCardData.character) return;
    if (!bindWorldbook) return;
    var ch = characterMap[currentCardData.character];
    if (!ch) return;
    addCharacterEntry(ch);
}

function resolveWorldbookAPI() {
    var wb = typeof updateWorldbookWith === 'function' ? updateWorldbookWith : null;
    if (!wb && window.parent) wb = window.parent.updateWorldbookWith;
    var getWB = typeof getOrCreateChatWorldbook === 'function' ? getOrCreateChatWorldbook :
        (typeof getOrCreateChatLorebook === 'function' ? getOrCreateChatLorebook : null);
    if (!getWB && window.parent) getWB = window.parent.getOrCreateChatWorldbook || window.parent.getOrCreateChatLorebook;
    return { updateWB: wb, getOrCreateWB: getWB };
}

async function getCurrentWorldbookName() {
    var apis = resolveWorldbookAPI();
    if (typeof apis.getOrCreateWB === 'function') {
        var name = await apis.getOrCreateWB('current');
        if (name) return name;
    }
    return 'current';
}

async function addCharacterEntry(ch) {
    var apis = resolveWorldbookAPI();
    var entryName = '[花园角色]' + ch._filename;

    if (typeof apis.updateWB === 'function') {
        var wbName = await getCurrentWorldbookName();
        await apis.updateWB(wbName, function(entries) {
            var found = false;
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].name === entryName) {
                    entries[i] = buildCharacterEntry(ch, entryName);
                    found = true;
                    break;
                }
            }
            if (!found) entries.push(buildCharacterEntry(ch, entryName));
            return entries;
        });
        console.log('[花园] 已绑定角色到世界书:', ch._filename);
        return;
    }

    if (typeof triggerSlash !== 'undefined') {
        var content = (ch.content || ch._filename || '').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        triggerSlash('/createentry file="' + (ch.worldbook || '花园角色库') + '" key="' + entryName + '" "' + content + '"');
        console.log('[花园] 已通过斜杠命令添加角色:', ch._filename);
        return;
    }

    console.log('[花园] 非ST环境，已选择角色:', ch._filename);
}

function buildCharacterEntry(ch, entryName) {
    return {
        name: entryName,
        enabled: true,
        content: ch.content || '',
        strategy: {
            type: 'constant',
            keys: [entryName, ch._filename],
            keys_secondary: { logic: 'and_any', keys: [] },
            scan_depth: 'same_as_global'
        },
        position: { type: 'at_depth', role: 'system', depth: 4, order: 100 },
        probability: 100
    };
}

function loadStart() {
    sendStartContent();
    bindWorldbookIfNeeded();
}

function loadStartFromView() {
    sendStartContent();
    bindWorldbookIfNeeded();
    closeModal('view-start-modal');
}

function updateBindWorldbook() {
    bindWorldbook = document.getElementById('modal-bind-worldbook').checked;
}

async function bindCharacterClear() {
    if (!currentCardData) return;
    closeModal('character-modal');
    var apis = resolveWorldbookAPI();
    if (typeof apis.updateWB === 'function') {
        var wbName = await getCurrentWorldbookName();
        await apis.updateWB(wbName, function(entries) {
            return entries.filter(function(e) {
                return !(e.name && e.name.indexOf('[花园角色]') === 0);
            });
        });
    }
    addCharacterEntry(currentCardData);
}

async function addCharacterToExtra() {
    if (!currentCardData) return;
    closeModal('character-modal');
    await addCharacterEntry(currentCardData);
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

var filterTags = {};
var filterSearches = {};
var filterOpen = false;

function getFilterKey() {
    var activeTab = document.querySelector('.tab-content.active');
    if (activeTab && (activeTab.id === 'tab3' || activeTab.id === 'tab4' || activeTab.id === 'tab6')) return activeTab.id;
    return 'tab3';
}

function toggleFilter() {
    filterOpen = !filterOpen;
    var panel = document.getElementById('filter-panel');
    var trigger = document.getElementById('filter-trigger');
    if (filterOpen) {
        panel.classList.add('show');
        trigger.classList.add('active');
        var key = getFilterKey();
        document.getElementById('filter-search').value = filterSearches[key] || '';
        buildTagCloud();
        applyFilter();
    } else {
        closeFilter();
    }
}

function closeFilter() {
    filterOpen = false;
    var key = getFilterKey();
    filterTags[key] = null;
    filterSearches[key] = '';
    document.getElementById('filter-panel').classList.remove('show');
    document.getElementById('filter-trigger').classList.remove('active');
    document.getElementById('filter-search').value = '';
    refreshCurrentCards();
}

function buildTagCloud() {
    var dataArray = getActiveTabCards();
    var tagMap = {};
    dataArray.forEach(function(card) {
        if (card.tags && card.tags.length > 0) {
            card.tags.forEach(function(tag) {
                tagMap[tag] = (tagMap[tag] || 0) + 1;
            });
        }
    });
    var sorted = Object.keys(tagMap).sort(function(a, b) { return tagMap[b] - tagMap[a]; });

    var key = getFilterKey();
    var currentTag = filterTags[key] || null;
    var container = document.getElementById('filter-tags');
    var html = '';
    sorted.forEach(function(tag) {
        var active = (currentTag === tag) ? ' active' : '';
        html += '<span class="filter-tag-badge' + active + '" onclick="selectTag(\'' + escapeHtml(tag) + '\')">#' + escapeHtml(tag) + '<span class="tag-count">' + tagMap[tag] + '</span></span>';
    });
    container.innerHTML = html;
}

function selectTag(tag) {
    var key = getFilterKey();
    if (filterTags[key] === tag) {
        filterTags[key] = null;
    } else {
        filterTags[key] = tag;
    }
    buildTagCloud();
    applyFilter();
}

function getActiveTabCards() {
    var activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'tab3') return startCardsData;
    if (activeTab && activeTab.id === 'tab4') return submissionCardsData;
    if (activeTab && activeTab.id === 'tab6') return characterCardsData;
    return [];
}

function getActiveContainerId() {
    var activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'tab3') return 'start-cards-grid';
    if (activeTab && activeTab.id === 'tab4') return 'submission-cards-grid';
    if (activeTab && activeTab.id === 'tab6') return 'character-cards-grid';
    return null;
}

function applyFilter() {
    if (!filterOpen) return;
    var key = getFilterKey();
    var searchText = (document.getElementById('filter-search').value || '').toLowerCase();
    filterSearches[key] = searchText;
    var dataArray = getActiveTabCards();
    var containerId = getActiveContainerId();
    if (!containerId || !dataArray.length) return;

    var activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'tab3' && favModeStarts) {
        var favIds = getFavorites('starts');
        dataArray = dataArray.filter(function(c) { return favIds.indexOf(c.id) >= 0; });
    } else if (activeTab && activeTab.id === 'tab4' && favModeSubs) {
        var favIds = getFavorites('subs');
        dataArray = dataArray.filter(function(c) { return favIds.indexOf(c.id) >= 0; });
    } else if (activeTab && activeTab.id === 'tab6' && favModeChars) {
        var favIds = getFavorites('chars');
        dataArray = dataArray.filter(function(c) { return favIds.indexOf(c.id) >= 0; });
    }

    var currentTag = filterTags[key] || null;
    var filtered = dataArray.filter(function(card) {
        var matchTag = !currentTag || (card.tags && card.tags.indexOf(currentTag) >= 0);
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
    renderStartCards('character-cards-grid', characterCardsData);
}

var favModeStarts = false;
var favModeSubs = false;
var favModeChars = false;

function getFavKey(type) {
    if (type === 'starts') return 'garden-fav-starts';
    if (type === 'subs') return 'garden-fav-subs';
    return 'garden-fav-chars';
}

function getFavorites(type) {
    try {
        return JSON.parse(localStorage.getItem(getFavKey(type)) || '[]');
    } catch (e) { return []; }
}

function saveFavorites(type, arr) {
    localStorage.setItem(getFavKey(type), JSON.stringify(arr));
}

function isFavorited(cardId, type) {
    return getFavorites(type).indexOf(cardId) >= 0;
}

function toggleFavoriteCard() {
    if (!currentCardData) return;
    var activeTab = document.querySelector('.tab-content.active');
    var type = 'starts';
    if (activeTab && activeTab.id === 'tab4') type = 'subs';
    if (activeTab && activeTab.id === 'tab6') type = 'chars';
    var favs = getFavorites(type);
    var idx = favs.indexOf(currentCardData.id);
    if (idx >= 0) {
        favs.splice(idx, 1);
    } else {
        favs.push(currentCardData.id);
    }
    saveFavorites(type, favs);
    updateFavButton();
    updateFavToggleCount(type);
    refreshCurrentCards();
}

function toggleFavoriteCharacter() {
    if (!currentCardData) return;
    var favs = getFavorites('chars');
    var idx = favs.indexOf(currentCardData.id);
    if (idx >= 0) {
        favs.splice(idx, 1);
    } else {
        favs.push(currentCardData.id);
    }
    saveFavorites('chars', favs);
    updateCharacterFavButton();
    updateFavToggleCount('chars');
    refreshCurrentCards();
}

function updateFavButton() {
    if (!currentCardData) return;
    var activeTab = document.querySelector('.tab-content.active');
    var type = 'starts';
    if (activeTab && activeTab.id === 'tab4') type = 'subs';
    if (activeTab && activeTab.id === 'tab6') type = 'chars';
    var btn = document.getElementById('modal-fav-btn');
    if (isFavorited(currentCardData.id, type)) {
        btn.classList.add('favorited');
    } else {
        btn.classList.remove('favorited');
    }
}

function updateCharacterFavButton() {
    if (!currentCardData) return;
    var btn = document.getElementById('character-modal-fav-btn');
    if (isFavorited(currentCardData.id, 'chars')) {
        btn.classList.add('favorited');
    } else {
        btn.classList.remove('favorited');
    }
}

function updateFavToggleCount(type) {
    var btn = document.getElementById('fav-toggle-' + type);
    if (!btn) return;
    var count = getFavorites(type).length;
    var existing = btn.querySelector('.fav-count');
    if (existing) existing.remove();
    if (count > 0) {
        var span = document.createElement('span');
        span.className = 'fav-count';
        span.textContent = count;
        btn.appendChild(span);
    }
}

function toggleFavoritesView(type) {
    if (type === 'starts') {
        favModeStarts = !favModeStarts;
    } else if (type === 'subs') {
        favModeSubs = !favModeSubs;
    } else {
        favModeChars = !favModeChars;
    }
    var active = (type === 'starts') ? favModeStarts : (type === 'subs') ? favModeSubs : favModeChars;
    var btn = document.getElementById('fav-toggle-' + type);
    if (active) {
        btn.classList.add('active');
        btn.childNodes[0].textContent = '🌼 收藏中';
    } else {
        btn.classList.remove('active');
        btn.childNodes[0].textContent = '📁 收藏夹';
    }
    updateFavToggleCount(type);
    refreshCurrentCards();
}

function refreshCurrentCards() {
    var activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;
    if (activeTab.id === 'tab3') {
        var data = startCardsData;
        if (favModeStarts) {
            var favIds = getFavorites('starts');
            data = data.filter(function(c) { return favIds.indexOf(c.id) >= 0; });
        }
        renderStartCards('start-cards-grid', data);
    } else if (activeTab.id === 'tab4') {
        var data = submissionCardsData;
        if (favModeSubs) {
            var favIds = getFavorites('subs');
            data = data.filter(function(c) { return favIds.indexOf(c.id) >= 0; });
        }
        renderStartCards('submission-cards-grid', data);
    } else if (activeTab.id === 'tab6') {
        var data = characterCardsData;
        if (favModeChars) {
            var favIds = getFavorites('chars');
            data = data.filter(function(c) { return favIds.indexOf(c.id) >= 0; });
        }
        renderStartCards('character-cards-grid', data);
    }
}

function setFontSizeUI(n) {
    document.body.style.setProperty('--font-size-base', n + 'px');
    localStorage.setItem('garden-fontsize-ui', n);
    var sizeIdx = { 12: 0, 16: 1, 20: 2, 24: 3, 28: 4, 32: 5 };
    var btns = document.querySelectorAll('.settings-row:nth-of-type(2) .col-btn');
    btns.forEach(function(btn, i) {
        btn.classList.toggle('active', i === sizeIdx[n]);
    });
}

function setFontSizeCards(n) {
    document.body.style.setProperty('--font-size-cards', n + 'px');
    localStorage.setItem('garden-fontsize-cards', n);
    var sizeIdx = { 12: 0, 14: 1, 18: 2, 22: 3, 26: 4, 30: 5 };
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
    characterCardsData = await loadCards(CHARACTER_CARDS_FILES);
    characterCardsData.forEach(function(ch) {
        characterMap[ch._filename] = ch;
    });
    renderStartCards('start-cards-grid', startCardsData);
    renderStartCards('submission-cards-grid', submissionCardsData);
    renderStartCards('character-cards-grid', characterCardsData);
    loadPreface();
    loadHistory();
    initSettings();
    updateFavToggleCount('starts');
    updateFavToggleCount('subs');
    updateFavToggleCount('chars');
});

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target.id);
    }
});
