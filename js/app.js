var startCardsData = [];
var submissionCardsData = [];
var characterCardsData = [];
var modCardsData = [];
var characterMap = {};
var currentCardData = null;
var bindWorldbook = true;
var detailEditMode = false;
var associatedItems = [];
var showWbName = false;
var currentWbStatusTable = '';
var currentCreatedWbList = [];
var currentMountedWbList = [];

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

    var isCardTab = (tabId === 'tab3' || tabId === 'tab4' || tabId === 'tab6' || tabId === 'tab7');
    var trigger = document.getElementById('filter-trigger');
    trigger.style.display = isCardTab ? '' : 'none';
    var detailTrigger = document.getElementById('detail-edit-trigger');
    detailTrigger.style.display = (tabId === 'tab6' || tabId === 'tab7') ? '' : 'none';
    if (tabId !== 'tab6' && tabId !== 'tab7' && detailEditMode) {
        detailEditMode = false;
        detailTrigger.classList.remove('active');
    }

    if (!isCardTab && filterOpen) {
        closeFilter();
    }
    if (tabId === 'tab8') {
        refreshCreatedWorldbooks();
        refreshGlobalWorldbooks();
    }
    if (isCardTab) {
        if (tabId === 'tab3') {
            updateFavToggleCount('starts');
            if (favModeStarts) refreshCurrentCards();
        } else if (tabId === 'tab4') {
            updateFavToggleCount('subs');
            if (favModeSubs) refreshCurrentCards();
        } else if (tabId === 'tab7') {
            updateFavToggleCount('mods');
            if (favModeMods) refreshCurrentCards();
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
                } else if (containerId === 'mod-cards-grid') {
                    openModModal(foundCard);
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

    renderAssociatedContent(cardData);

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

    renderSingleWorldbookStatus(cardData, 'character-associated-table', 'character');

    var wbRow = document.getElementById('character-wb-name-row');
    wbRow.style.display = showWbName ? '' : 'none';
    if (showWbName) {
        var wbInput = document.getElementById('character-wb-name');
        wbInput.value = cardData.worldbook || '';
    }

    var detailSection = document.getElementById('character-detail-edit');
    if (detailEditMode) {
        detailSection.style.display = '';
        var posType = (cardData.position && cardData.position.type) || 'at_depth';
        document.getElementById('detail-position-type').value = posType;
        document.getElementById('detail-role').value = (cardData.position && cardData.position.role) || 'system';
        document.getElementById('detail-depth').value = (cardData.position && cardData.position.depth) || 4;
        document.getElementById('detail-order').value = (cardData.position && cardData.position.order) || 0;
        document.getElementById('detail-depth-fields').style.display = (posType === 'at_depth') ? '' : 'none';
    } else {
        detailSection.style.display = 'none';
    }

    document.getElementById('character-modal').classList.add('show');
    updateCharacterFavButton();
}

async function renderSingleWorldbookStatus(cardData, tableId, type) {
    var wbName = cardData.worldbook || (cardData._filename + '的世界书');
    var tableEl = document.getElementById(tableId);
    if (!tableEl) return;

    currentWbStatusTable = tableId;

    var exists = await checkSingleWorldbook(wbName);
    var indicatorClass = exists ? 'green' : 'red';
    var indicatorTitle = exists ? '世界书已存在' : '世界书不存在';
    var createBtn = !exists
        ? '<button class="row-create-btn" onclick="createWorldbookFromStatus()">📝 创建</button>'
        : '';

    var html = '<div class="associated-row">';
    html += '<span class="row-type row-type-char">世界书</span>';
    html += '<span class="row-name">' + escapeHtml(wbName) + '</span>';
    html += '<span class="row-indicator ' + indicatorClass + '" title="' + indicatorTitle + '"></span>';
    html += createBtn;
    html += '</div>';
    tableEl.innerHTML = html;
}

async function checkSingleWorldbook(wbName) {
    var helper = resolveHelperAPI();
    if (typeof helper.getLorebooks === 'function') {
        try {
            var result = await helper.getLorebooks();
            if (result) return result.indexOf(wbName) >= 0;
        } catch(e) {}
    }
    return false;
}

function createWorldbookFromStatus() {
    if (!currentCardData) return;
    var wbName = currentCardData.worldbook || (currentCardData._filename + '的世界书');
    var tableId = currentWbStatusTable;
    ensureWorldbookCreated(wbName).then(async function(ok) {
        if (ok) {
            if (tableId.indexOf('character') >= 0) {
                await addCharacterEntry(currentCardData, wbName);
            } else if (tableId.indexOf('mod') >= 0) {
                await addModEntry(currentCardData, wbName);
            }
            showToast('花园', '世界书 "' + wbName + '" 已创建');
            if (tableId && currentCardData) {
                renderSingleWorldbookStatus(currentCardData, tableId, '');
            }
        } else {
            showToast('花园', '创建失败: ' + wbName);
        }
    });
}

function openModModal(cardData) {
    currentCardData = cardData;

    document.getElementById('mod-modal-title').textContent = cardData._filename || '未命名';

    var authorEl = document.getElementById('mod-modal-author');
    if (cardData.author) {
        authorEl.textContent = '✎ ' + cardData.author;
        authorEl.style.display = 'inline';
    } else {
        authorEl.style.display = 'none';
    }

    var tagsContainer = document.getElementById('mod-modal-tags');
    if (cardData.tags && cardData.tags.length > 0) {
        tagsContainer.innerHTML = cardData.tags.map(function(tag) {
            return '<span class="modal-tag">#' + escapeHtml(tag) + '</span>';
        }).join('');
        tagsContainer.style.display = 'flex';
    } else {
        tagsContainer.innerHTML = '';
        tagsContainer.style.display = 'none';
    }

    document.getElementById('mod-modal-preview').textContent = cardData.content || '暂无描述';

    renderSingleWorldbookStatus(cardData, 'mod-associated-table', 'mod');

    var wbRow = document.getElementById('mod-wb-name-row');
    wbRow.style.display = showWbName ? '' : 'none';
    if (showWbName) {
        document.getElementById('mod-wb-name').value = cardData.worldbook || '';
    }

    var detailSection = document.getElementById('mod-detail-edit');
    if (detailEditMode) {
        detailSection.style.display = '';
        var posType = (cardData.position && cardData.position.type) || 'at_depth';
        document.getElementById('mod-detail-position-type').value = posType;
        document.getElementById('mod-detail-role').value = (cardData.position && cardData.position.role) || 'system';
        document.getElementById('mod-detail-depth').value = (cardData.position && cardData.position.depth) || 4;
        document.getElementById('mod-detail-order').value = (cardData.position && cardData.position.order) || 0;
        document.getElementById('mod-detail-depth-fields').style.display = (posType === 'at_depth') ? '' : 'none';
    } else {
        detailSection.style.display = 'none';
    }

    document.getElementById('mod-modal').classList.add('show');
    updateModFavButton();
}

function toggleFavoriteMod() {
    if (!currentCardData) return;
    var favs = getFavorites('mods');
    var idx = favs.indexOf(currentCardData.id);
    if (idx >= 0) {
        favs.splice(idx, 1);
    } else {
        favs.push(currentCardData.id);
    }
    saveFavorites('mods', favs);
    updateModFavButton();
    updateFavToggleCount('mods');
    refreshCurrentCards();
}

function updateModFavButton() {
    if (!currentCardData) return;
    var btn = document.getElementById('mod-modal-fav-btn');
    if (isFavorited(currentCardData.id, 'mods')) {
        btn.classList.add('favorited');
    } else {
        btn.classList.remove('favorited');
    }
}

async function createModWorldbook() {
    if (!currentCardData) return;
    var wbName = showWbName ? document.getElementById('mod-wb-name').value.trim() : '';
    if (!wbName) { wbName = currentCardData.worldbook || (currentCardData._filename + '的世界书'); }
    closeModal('mod-modal');

    var ok = await ensureWorldbookCreated(wbName);
    if (!ok) {
        var helper = resolveHelperAPI();
        if (typeof helper.createLorebook !== 'function') {
            showToast('花园', '前端助手插件未安装，无法创建独立世界书。请在ST中安装"前端助手"插件。');
        } else {
            showToast('花园', '创建失败: ' + wbName);
        }
        return;
    }
    await addModEntry(currentCardData, wbName);
    showToast('花园', '世界书 "' + wbName + '" 已创建并写入Mod ' + currentCardData._filename);
}

async function mountModGlobal() {
    if (!currentCardData) return;
    var wbName = showWbName ? document.getElementById('mod-wb-name').value.trim() : '';
    if (!wbName) { wbName = currentCardData.worldbook || (currentCardData._filename + '的世界书'); }
    closeModal('mod-modal');
    globallyActivate(wbName);
    showToast('花园', '世界书 "' + wbName + '" 已挂载到全局');
}

function toggleModDepthFields() {
    var type = document.getElementById('mod-detail-position-type').value;
    var div = document.getElementById('mod-detail-depth-fields');
    div.style.display = (type === 'at_depth') ? '' : 'none';
}

async function addModEntry(cardData, wbName) {
    var entryName = '[花园Mod]' + cardData._filename;
    var content = cardData.content || cardData._filename;
    var posType = (cardData.position && cardData.position.type) || 'at_depth';
    var posRole = (cardData.position && cardData.position.role) || 'system';
    var posDepth = (cardData.position && cardData.position.depth) || 4;
    var posOrder = (cardData.position && cardData.position.order) || 0;
    if (detailEditMode) {
        posType = document.getElementById('mod-detail-position-type').value || 'at_depth';
        posRole = document.getElementById('mod-detail-role').value || 'system';
        posDepth = parseInt(document.getElementById('mod-detail-depth').value) || 4;
        posOrder = parseInt(document.getElementById('mod-detail-order').value) || 0;
    }

    var apis = resolveWorldbookAPI();
    if (typeof apis.updateWB === 'function') {
        var positionObj = { type: posType, order: posOrder };
        if (posType === 'at_depth') { positionObj.role = posRole; positionObj.depth = posDepth; }
        try {
            await apis.updateWB(wbName, function(entries) {
                var entry = {
                    name: entryName, enabled: true, content: content,
                    strategy: { type: 'constant', keys: [entryName, cardData._filename], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
                    position: positionObj, probability: 100
                };
                var found = false;
                for (var i = 0; i < entries.length; i++) {
                    if (entries[i].name === entryName) { entries[i] = entry; found = true; break; }
                }
                if (!found) entries.push(entry);
                return entries;
            });
            return;
        } catch(e) { console.log('[花园] updateWB mod失败:', e); }
    }

    var helper = resolveHelperAPI();
    if (typeof helper.createEntry === 'function') {
        try {
            await helper.createEntry(wbName, {
                comment: entryName,
                content: content,
                key: [entryName, cardData._filename],
                enabled: true,
                type: 'constant',
                order: posOrder,
                position: posType,
                depth: posType === 'at_depth' ? posDepth : undefined,
                role: posType === 'at_depth' ? posRole : undefined
            });
            return;
        } catch(e) { console.log('[花园] createLorebookEntry mod失败:', e); }
    }

    var escapedContent = content.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    executeSTCommand('/createentry file="' + wbName + '" key="' + entryName + '" "' + escapedContent + '"');
}

function toggleShowWbName(checked) {
    showWbName = checked;
    localStorage.setItem('garden-show-wb-name', checked ? '1' : '0');
}

// ==================== 额外内容管理 ====================

async function refreshCreatedWorldbooks() {
    var listEl = document.getElementById('wb-created-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="wb-manage-empty">⏳ 加载中...</div>';

    var helper = resolveHelperAPI();
    var allNames = [];
    if (typeof helper.getLorebooks === 'function') {
        try {
            var result = await helper.getLorebooks();
            if (result && Array.isArray(result)) allNames = result;
        } catch(e) { console.log('[花园] getLorebooks 失败:', e); }
    }

    var filtered = allNames.filter(function(name) {
        return name && name.indexOf('的世界书') >= 0 && name.indexOf('的世界书') === name.length - 4;
    });

    currentCreatedWbList = filtered;

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="wb-manage-empty">📭 暂无匹配"XX的世界书"格式的世界书</div>';
        return;
    }

    var html = '';
    filtered.forEach(function(name, i) {
        html += '<div class="wb-manage-row">';
        html += '<span class="wb-manage-name">📖 ' + escapeHtml(name) + '</span>';
        html += '<div class="wb-manage-row-actions">';
        html += '<button class="btn btn-success btn-xs" onclick="mountCreatedWbByIndex(' + i + ')">🌐 挂载</button>';
        html += '<button class="btn btn-danger btn-xs" onclick="deleteCreatedWbByIndex(' + i + ')">🗑 删除</button>';
        html += '</div>';
        html += '</div>';
    });
    listEl.innerHTML = html;
}

function mountCreatedWbByIndex(index) {
    var name = currentCreatedWbList[index];
    if (!name) return;
    globallyActivate(name);
    showToast('花园', '已挂载到全局: ' + name);
    setTimeout(function() { refreshGlobalWorldbooks(); }, 500);
}

function deleteCreatedWbByIndex(index) {
    var name = currentCreatedWbList[index];
    if (!name) return;
    if (!confirm('确定要删除世界书 "' + name + '" 吗？此操作不可撤销。')) return;

    var helper = resolveHelperAPI();
    if (typeof helper.deleteLorebook === 'function') {
        helper.deleteLorebook(name).then(function() {
            showToast('花园', '已删除: ' + name);
            refreshCreatedWorldbooks();
            refreshGlobalWorldbooks();
        }).catch(function() {
            showToast('花园', '删除失败: ' + name);
        });
    } else {
        showToast('花园', '前端助手插件未安装或不支持删除功能');
        refreshCreatedWorldbooks();
    }
}

async function refreshGlobalWorldbooks() {
    var listEl = document.getElementById('wb-global-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="wb-manage-empty">⏳ 加载中...</div>';

    var mountedNames = await getMountedWorldbooks();
    currentMountedWbList = mountedNames;

    if (mountedNames.length === 0) {
        listEl.innerHTML = '<div class="wb-manage-empty">📭 当前没有全局挂载的世界书</div>';
        return;
    }

    var html = '';
    mountedNames.forEach(function(name, i) {
        html += '<div class="wb-manage-row">';
        html += '<span class="wb-manage-name">🌐 ' + escapeHtml(name) + '</span>';
        html += '<button class="btn btn-secondary btn-xs" onclick="unmountGlobalWbByIndex(' + i + ')">✕ 关闭</button>';
        html += '</div>';
    });
    listEl.innerHTML = html;
}

function unmountGlobalWbByIndex(index) {
    var name = currentMountedWbList[index];
    if (!name) return;
    var ctx = getSTContext();
    if (ctx && typeof ctx.executeSlashCommandsWithOptions === 'function') {
        try { ctx.executeSlashCommandsWithOptions('/world state=off ' + name, { handleParserErrors: false }); } catch(e) {}
    }
    executeSTCommand('/world state=off ' + name);
    showToast('花园', '已关闭: ' + name);
    setTimeout(function() { refreshGlobalWorldbooks(); }, 500);
}

async function getMountedWorldbooks() {
    var names = [];

    if (typeof getActivatedWorldbooks === 'function') {
        try {
            var result = await getActivatedWorldbooks();
            if (result && Array.isArray(result)) names = result;
        } catch(e) {}
    }

    if (names.length === 0) {
        try {
            if (typeof getActiveWorldInfoNames === 'function') {
                var result = getActiveWorldInfoNames();
                if (result && Array.isArray(result)) names = result;
            }
        } catch(e) {}
    }

    var ctx = getSTContext();
    if (names.length === 0 && ctx) {
        try {
            if (ctx.worldInfo && Array.isArray(ctx.worldInfo)) {
                names = ctx.worldInfo;
            } else if (ctx.character && ctx.character.data && ctx.character.data.world) {
                var w = ctx.character.data.world;
                if (Array.isArray(w)) names = w.map(function(item) { return typeof item === 'string' ? item : item.name || ''; }).filter(Boolean);
            }
        } catch(e) {}
    }

    if (names.length === 0 && window.parent && window.parent.SillyTavern) {
        try {
            var st = window.parent.SillyTavern;
            if (st.worldInfo && Array.isArray(st.worldInfo)) {
                names = st.worldInfo;
            }
        } catch(e) {}
    }

    return names.filter(function(n) { return n && typeof n === 'string'; });
}

function unmountWorldbookFromGlobal(name) {
    var ctx = getSTContext();
    if (ctx && typeof ctx.executeSlashCommandsWithOptions === 'function') {
        try { ctx.executeSlashCommandsWithOptions('/world state=off ' + name, { handleParserErrors: false }); } catch(e) {}
    }
    executeSTCommand('/world state=off ' + name);
    showToast('花园', '已关闭: ' + name);
    setTimeout(function() { refreshGlobalWorldbooks(); }, 500);
}

function clearAllGlobalWorldbooks() {
    if (!confirm('确定要清空所有全局挂载的世界书吗？')) return;

    var ctx = getSTContext();
    if (ctx && typeof ctx.executeSlashCommandsWithOptions === 'function') {
        try { ctx.executeSlashCommandsWithOptions('/world state=off', { handleParserErrors: false }); } catch(e) {}
    }
    executeSTCommand('/world state=off');
    showToast('花园', '已清空所有全局挂载的世界书');
    setTimeout(function() { refreshGlobalWorldbooks(); }, 500);
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

async function bindWorldbookIfNeeded() {
    if (!currentCardData || !currentCardData.character) return;
    if (!bindWorldbook) return;
    var ch = characterMap[currentCardData.character];
    if (!ch) return;
    var wbName = ch.worldbook || (ch._filename + '的世界书');
    var ok = await ensureWorldbookCreated(wbName);
    if (!ok) { showToast('花园', '世界书创建失败: ' + wbName); return; }
    await addCharacterEntry(ch, wbName);
    globallyActivate(wbName);
    showToast('花园', ch._filename + ' 已创建并挂载到全局');
}

function resolveHelperAPI() {
    var createLB = typeof createLorebook === 'function' ? createLorebook : null;
    var createEntry = typeof createLorebookEntry === 'function' ? createLorebookEntry : null;
    var setEntries = typeof setLorebookEntries === 'function' ? setLorebookEntries : null;
    var getLBs = typeof getLorebooks === 'function' ? getLorebooks : null;
    var deleteLB = typeof deleteLorebook === 'function' ? deleteLorebook : null;
    console.log('[花园] 前端助手API: createLorebook=' + !!createLB + ' createEntry=' + !!createEntry + ' setEntries=' + !!setEntries + ' getLBs=' + !!getLBs + ' deleteLB=' + !!deleteLB);
    return { createLorebook: createLB, createEntry: createEntry, setEntries: setEntries, getLorebooks: getLBs, deleteLorebook: deleteLB };
}

function resolveWorldbookAPI() {
    var result = { updateWB: null, getOrCreateWB: null };
    if (typeof updateWorldbookWith === 'function') result.updateWB = updateWorldbookWith;
    if (!result.updateWB) { try { if (window.parent && typeof window.parent.updateWorldbookWith === 'function') result.updateWB = window.parent.updateWorldbookWith; } catch(e) {} }
    if (typeof getOrCreateChatWorldbook === 'function') result.getOrCreateWB = getOrCreateChatWorldbook;
    if (typeof getOrCreateChatLorebook === 'function' && !result.getOrCreateWB) result.getOrCreateWB = getOrCreateChatLorebook;
    if (!result.getOrCreateWB) {
        try {
            if (window.parent) {
                if (typeof window.parent.getOrCreateChatWorldbook === 'function') result.getOrCreateWB = window.parent.getOrCreateChatWorldbook;
                else if (typeof window.parent.getOrCreateChatLorebook === 'function') result.getOrCreateWB = window.parent.getOrCreateChatLorebook;
            }
        } catch(e) {}
    }
    return result;
}

async function ensureWorldbookCreated(wbName) {
    var helper = resolveHelperAPI();
    if (typeof helper.createLorebook === 'function') {
        try {
            if (typeof helper.getLorebooks === 'function') {
                var existing = await helper.getLorebooks();
                if (existing && existing.indexOf(wbName) >= 0) {
                    console.log('[花园] 世界书已存在:', wbName);
                    return true;
                }
            }
            var ok = await helper.createLorebook(wbName);
            if (ok) { console.log('[花园] createLorebook 成功:', wbName); return true; }
            console.log('[花园] createLorebook 返回 false:', wbName);
        } catch(e) { console.log('[花园] createLorebook 异常:', e); }
    }
    var apis = resolveWorldbookAPI();
    if (typeof apis.getOrCreateWB === 'function') {
        try { await apis.getOrCreateWB(wbName); console.log('[花园] getOrCreate 完成:', wbName); return true; } catch(e) { console.log('[花园] getOrCreate 失败:', e); }
    }
    return false;
}

function globallyActivate(wbName) {
    var ctx = getSTContext();
    if (ctx && typeof ctx.executeSlashCommandsWithOptions === 'function') {
        try { ctx.executeSlashCommandsWithOptions('/world state=on ' + wbName, { handleParserErrors: false }); return; } catch(e) {}
    }
    executeSTCommand('/world state=on ' + wbName);
}

async function getCurrentWorldbookName() {
    var apis = resolveWorldbookAPI();
    if (typeof apis.getOrCreateWB === 'function') {
        try { var name = await apis.getOrCreateWB('current'); if (name) return name; } catch(e) {}
    }
    return 'current';
}

function getSTContext() {
    try {
        var ctx = window.parent && window.parent.SillyTavern && window.parent.SillyTavern.getContext && window.parent.SillyTavern.getContext();
        if (ctx) return ctx;
    } catch(e) {}
    return null;
}

function executeSTCommand(cmd) {
    var ctx = getSTContext();
    if (ctx && typeof ctx.executeSlashCommandsWithOptions === 'function') {
        try { ctx.executeSlashCommandsWithOptions(cmd, { handleParserErrors: false }); return true; } catch(e) {}
    }
    if (typeof triggerSlash !== 'undefined') {
        try { triggerSlash(cmd); return true; } catch(e) {}
    }
    return false;
}

function showToast(title, text) {
    var ctx = getSTContext();
    if (ctx && typeof ctx.executeSlashCommandsWithOptions === 'function') {
        try { ctx.executeSlashCommandsWithOptions('/echo title="' + title + '" severity=success ' + text, { handleParserErrors: false }); return; } catch(e) {}
    }
    if (typeof triggerSlash !== 'undefined') {
        try { triggerSlash('/echo title="' + title + '" severity=success ' + text); } catch(e) {}
    }
}

async function addCharacterEntry(ch, wbName) {
    var entryName = '[花园角色]' + ch._filename;
    var content = ch.content || ch._filename;
    var posType = (ch.position && ch.position.type) || 'at_depth';
    var posRole = (ch.position && ch.position.role) || 'system';
    var posDepth = (ch.position && ch.position.depth) || 4;
    var posOrder = (ch.position && ch.position.order) || 0;
    if (detailEditMode) {
        posType = document.getElementById('detail-position-type').value || 'at_depth';
        posRole = document.getElementById('detail-role').value || 'system';
        posDepth = parseInt(document.getElementById('detail-depth').value) || 4;
        posOrder = parseInt(document.getElementById('detail-order').value) || 0;
    }
    console.log('[花园] 添加角色条目:', entryName, '→', wbName);

    var apis = resolveWorldbookAPI();
    if (typeof apis.updateWB === 'function') {
        var positionObj = { type: posType, order: posOrder };
        if (posType === 'at_depth') { positionObj.role = posRole; positionObj.depth = posDepth; }
        try {
            await apis.updateWB(wbName, function(entries) {
                var entry = {
                    name: entryName, enabled: true, content: content,
                    strategy: { type: 'constant', keys: [entryName, ch._filename], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
                    position: positionObj, probability: 100
                };
                var found = false;
                for (var i = 0; i < entries.length; i++) {
                    if (entries[i].name === entryName) { entries[i] = entry; found = true; break; }
                }
                if (!found) entries.push(entry);
                return entries;
            });
            console.log('[花园] updateWB 完成:', ch._filename);
            return;
        } catch(e) { console.log('[花园] updateWB 失败:', e); }
    }

    var helper = resolveHelperAPI();
    if (typeof helper.createEntry === 'function') {
        try {
            await helper.createEntry(wbName, {
                comment: entryName,
                content: content,
                key: [entryName, ch._filename],
                enabled: true,
                type: 'constant',
                order: posOrder,
                position: posType,
                depth: posType === 'at_depth' ? posDepth : undefined,
                role: posType === 'at_depth' ? posRole : undefined
            });
            console.log('[花园] createLorebookEntry 完成:', ch._filename);
            return;
        } catch(e) { console.log('[花园] createLorebookEntry 失败:', e); }
    }

    var escapedContent = content.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    executeSTCommand('/createentry file="' + wbName + '" key="' + entryName + '" "' + escapedContent + '"');
}

async function loadStart() {
    sendStartContent();
    await bindWorldbookIfNeeded();
    await mountAssociatedWorldbooks();
}

async function loadStartFromView() {
    sendStartContent();
    await bindWorldbookIfNeeded();
    await mountAssociatedWorldbooks();
    closeModal('view-start-modal');
}

function updateBindWorldbook() {
    bindWorldbook = document.getElementById('modal-bind-worldbook').checked;
}

function toggleDetailEdit() {
    detailEditMode = !detailEditMode;
    var btn = document.getElementById('detail-edit-trigger');
    if (detailEditMode) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
}

function toggleDepthFields() {
    var type = document.getElementById('detail-position-type').value;
    var div = document.getElementById('detail-depth-fields');
    div.style.display = (type === 'at_depth') ? '' : 'none';
}

async function createCharacterWorldbook() {
    if (!currentCardData) { console.log('[花园] createCharacterWorldbook: currentCardData 为空'); return; }
    var wbName = document.getElementById('character-wb-name').value.trim();
    if (!wbName) { wbName = currentCardData.worldbook || (currentCardData._filename + '的世界书'); }
    console.log('[花园] 创建世界书:', wbName, '角色:', currentCardData._filename);
    closeModal('character-modal');

    var ok = await ensureWorldbookCreated(wbName);
    if (!ok) {
        var helper = resolveHelperAPI();
        if (typeof helper.createLorebook !== 'function') {
            showToast('花园', '前端助手插件未安装，无法创建独立世界书。请在ST中安装"前端助手"插件。');
        } else {
            showToast('花园', '创建失败: ' + wbName);
        }
        return;
    }
    await addCharacterEntry(currentCardData, wbName);
    showToast('花园', '世界书 "' + wbName + '" 已创建并写入角色 ' + currentCardData._filename);
}

async function mountCharacterGlobal() {
    if (!currentCardData) { console.log('[花园] mountCharacterGlobal: currentCardData 为空'); return; }
    var wbName = document.getElementById('character-wb-name').value.trim();
    if (!wbName) { wbName = currentCardData.worldbook || (currentCardData._filename + '的世界书'); }
    console.log('[花园] 挂载到全局:', wbName);
    closeModal('character-modal');
    globallyActivate(wbName);
    showToast('花园', '世界书 "' + wbName + '" 已挂载到全局');
}

async function addCharacterToExtra() {
    if (!currentCardData) return;
    closeModal('character-modal');
    var wbName = await getCurrentWorldbookName();
    await addCharacterEntry(currentCardData, wbName);
    showToast('花园', currentCardData._filename + ' 已加入当前世界书');
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function collectAssociatedItems(cardData) {
    var items = [];
    if (cardData.related_characters && Array.isArray(cardData.related_characters)) {
        cardData.related_characters.forEach(function(name) {
            items.push({type: 'character', name: name});
        });
    }
    if (cardData.related_gameplay && Array.isArray(cardData.related_gameplay)) {
        cardData.related_gameplay.forEach(function(name) {
            items.push({type: 'gameplay', name: name});
        });
    }
    if (cardData.related_knowledge && Array.isArray(cardData.related_knowledge)) {
        cardData.related_knowledge.forEach(function(name) {
            items.push({type: 'knowledge', name: name});
        });
    }
    return items;
}

function getWorldbookNameForItem(item) {
    if (item.type === 'character' && characterMap[item.name]) {
        var ch = characterMap[item.name];
        return ch.worldbook || (ch._filename + '的世界书');
    }
    return item.name + '的世界书';
}

async function renderAssociatedContent(cardData) {
    var items = collectAssociatedItems(cardData);
    var titleEl = document.getElementById('modal-associated-title');
    var tableEl = document.getElementById('modal-associated-table');
    var batchEl = document.getElementById('modal-associated-batch');

    if (items.length === 0) {
        titleEl.style.display = 'none';
        tableEl.style.display = 'none';
        batchEl.style.display = 'none';
        associatedItems = [];
        return;
    }

    titleEl.style.display = '';
    tableEl.style.display = '';
    batchEl.style.display = '';

    associatedItems = items.map(function(item) {
        return {
            type: item.type,
            name: item.name,
            worldbookName: getWorldbookNameForItem(item),
            hasWorldbook: false,
            checked: true
        };
    });

    renderAssociatedTable();
    await checkAllWorldbooks();
    renderAssociatedTable();
}

function renderAssociatedTable() {
    var tableEl = document.getElementById('modal-associated-table');
    var hasMissing = false;
    var html = '';
    associatedItems.forEach(function(item, index) {
        var typeClass = '';
        var typeLabel = '';
        if (item.type === 'character') {
            typeClass = 'row-type-char';
            typeLabel = '人物';
        } else if (item.type === 'gameplay') {
            typeClass = 'row-type-gameplay';
            typeLabel = '玩法';
        } else {
            typeClass = 'row-type-knowledge';
            typeLabel = '知识';
        }

        var indicatorClass = item.hasWorldbook ? 'green' : 'red';
        if (!item.hasWorldbook) hasMissing = true;
        var checked = item.checked ? ' checked' : '';
        var createBtn = !item.hasWorldbook
            ? '<button class="row-create-btn" onclick="createAssociatedWorldbook(' + index + ')">📝 创建</button>'
            : '';

        html += '<div class="associated-row">';
        html += '<input type="checkbox" class="row-checkbox" ' + checked + ' onchange="toggleAssociatedCheck(' + index + ', this.checked)">';
        html += '<span class="row-type ' + typeClass + '">' + typeLabel + '</span>';
        html += '<span class="row-name">' + escapeHtml(item.name) + '</span>';
        html += '<span class="row-indicator ' + indicatorClass + '" title="' + (item.hasWorldbook ? '世界书已存在' : '世界书不存在，请创建') + '"></span>';
        html += createBtn;
        html += '</div>';
    });
    tableEl.innerHTML = html;

    var batchEl = document.getElementById('modal-associated-batch');
    batchEl.style.display = hasMissing ? '' : 'none';
}

async function checkAllWorldbooks() {
    var helper = resolveHelperAPI();
    var worldbookList = [];
    if (typeof helper.getLorebooks === 'function') {
        try {
            var result = await helper.getLorebooks();
            if (result) worldbookList = result;
        } catch(e) {}
    }

    associatedItems.forEach(function(item) {
        item.hasWorldbook = worldbookList.indexOf(item.worldbookName) >= 0;
    });
}

function toggleAssociatedCheck(index, checked) {
    associatedItems[index].checked = checked;
}

async function createAssociatedWorldbook(index) {
    var item = associatedItems[index];
    var ok = await ensureWorldbookCreated(item.worldbookName);
    if (!ok) {
        var helper = resolveHelperAPI();
        if (typeof helper.createLorebook !== 'function') {
            showToast('花园', '前端助手插件未安装，无法创建世界书。请在ST中安装"前端助手"插件。');
        } else {
            showToast('花园', '创建失败: ' + item.worldbookName);
        }
        return;
    }

    if (item.type === 'character' && characterMap[item.name]) {
        var ch = characterMap[item.name];
        await addCharacterEntry(ch, item.worldbookName);
    }

    item.hasWorldbook = true;
    renderAssociatedTable();
    showToast('花园', '世界书 "' + item.worldbookName + '" 已创建');
}

async function batchCreateAssociatedWorldbooks() {
    var toCreate = [];
    associatedItems.forEach(function(item, i) {
        if (item.checked && !item.hasWorldbook) {
            toCreate.push(i);
        }
    });
    if (toCreate.length === 0) {
        showToast('花园', '无需创建，所选内容均已拥有世界书');
        return;
    }

    showToast('花园', '正在依次创建 ' + toCreate.length + ' 个世界书...');
    for (var j = 0; j < toCreate.length; j++) {
        await createAssociatedWorldbook(toCreate[j]);
    }
    renderAssociatedTable();
    showToast('花园', '批量创建完成！共创建 ' + toCreate.length + ' 个世界书');
}

async function mountAssociatedWorldbooks() {
    var mounted = 0;
    for (var i = 0; i < associatedItems.length; i++) {
        var item = associatedItems[i];
        if (item.checked && item.hasWorldbook) {
            globallyActivate(item.worldbookName);
            mounted++;
        }
    }
    if (mounted > 0) {
        showToast('花园', '已挂载 ' + mounted + ' 个关联世界书到全局');
    }
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
    var savedShowWbName = localStorage.getItem('garden-show-wb-name');
    showWbName = (savedShowWbName === '1');
    var cb = document.getElementById('setting-show-wb-name');
    if (cb) cb.checked = showWbName;
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
    if (activeTab && (activeTab.id === 'tab3' || activeTab.id === 'tab4' || activeTab.id === 'tab6' || activeTab.id === 'tab7')) return activeTab.id;
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
    if (activeTab && activeTab.id === 'tab7') return modCardsData;
    return [];
}

function getActiveContainerId() {
    var activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'tab3') return 'start-cards-grid';
    if (activeTab && activeTab.id === 'tab4') return 'submission-cards-grid';
    if (activeTab && activeTab.id === 'tab6') return 'character-cards-grid';
    if (activeTab && activeTab.id === 'tab7') return 'mod-cards-grid';
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
    } else if (activeTab && activeTab.id === 'tab7' && favModeMods) {
        var favIds = getFavorites('mods');
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
    renderStartCards('mod-cards-grid', modCardsData);
}

var favModeStarts = false;
var favModeSubs = false;
var favModeChars = false;
var favModeMods = false;

function getFavKey(type) {
    if (type === 'starts') return 'garden-fav-starts';
    if (type === 'subs') return 'garden-fav-subs';
    if (type === 'mods') return 'garden-fav-mods';
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
    if (activeTab && activeTab.id === 'tab7') type = 'mods';
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
    if (activeTab && activeTab.id === 'tab7') type = 'mods';
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
    } else if (type === 'mods') {
        favModeMods = !favModeMods;
    } else {
        favModeChars = !favModeChars;
    }
    var active = (type === 'starts') ? favModeStarts : (type === 'subs') ? favModeSubs : (type === 'mods') ? favModeMods : favModeChars;
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
    } else if (activeTab.id === 'tab7') {
        var data = modCardsData;
        if (favModeMods) {
            var favIds = getFavorites('mods');
            data = data.filter(function(c) { return favIds.indexOf(c.id) >= 0; });
        }
        renderStartCards('mod-cards-grid', data);
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
    modCardsData = await loadCards(MOD_CARDS_FILES);
    characterCardsData.forEach(function(ch) {
        characterMap[ch._filename] = ch;
    });
    renderStartCards('start-cards-grid', startCardsData);
    renderStartCards('submission-cards-grid', submissionCardsData);
    renderStartCards('character-cards-grid', characterCardsData);
    renderStartCards('mod-cards-grid', modCardsData);
    loadPreface();
    loadHistory();
    initSettings();
    updateFavToggleCount('starts');
    updateFavToggleCount('subs');
    updateFavToggleCount('chars');
    updateFavToggleCount('mods');
});

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target.id);
    }
});
