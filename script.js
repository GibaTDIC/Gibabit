const firebaseConfig = {
    apiKey: "AIzaSyC3p8g6aIK5YPs9r6gKe-RHGiLYEd8RkHA",
    authDomain: "homegibabit.firebaseapp.com",
    projectId: "homegibabit",
    storageBucket: "homegibabit.firebasestorage.app",
    messagingSenderId: "830900117800",
    appId: "1:830900117800:web:24a8fb7e74a2e69d50701d"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const appsCol = db.collection("Aplicativos");
const catsCol = db.collection("Categorias");
const adminsCol = db.collection("admins");

const STORAGE_FAVS = "gibabit:favorites";
const STORAGE_RECENT = "gibabit:recent";
const STORAGE_MYUSAGE = "gibabit:my-usage";

function loadLocal(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
}
function saveLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error(e); }
}

let state = {
    apps: [],
    categories: [],
    favorites: [],
    recent: [],
    myUsage: {},
    search: "",
    activeCategory: "all",
    sortBy: "meus",
    adminMode: false,
    adminUser: null,
    reorderMode: false,
    selectionMode: null,
    selectedIds: new Set(),
    openMenuId: null,
    wizard: null,
    loginError: ""
};

function uid() { return 'a' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }
function nowIso() { return new Date().toISOString(); }
function fmtDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR');
}

const DEFAULT_CATEGORIES = [
    { id:"educacao", nome:"Educação", icone:"📘", cor:"#ff7a00", descricao:"Ferramentas pedagógicas e de sala de aula." },
    { id:"gestao", nome:"Gestão", icone:"🗂️", cor:"#4b3fa3", descricao:"Organização escolar e administrativa." },
    { id:"esportes", nome:"Esportes", icone:"🏆", cor:"#22c55e", descricao:"Treino, torneios e educação física." },
    { id:"avaliacao", nome:"Avaliação", icone:"📊", cor:"#378ade", descricao:"Testes, provas e acompanhamento de desempenho." }
];

const DEFAULT_APPS = [
    {
        id:"safe-programacao", nome:"Programação Escolar", descricao:"Organize aulas, tarefas e cronogramas escolares.",
        descricaoCompleta:"Organize aulas, tarefas e cronogramas escolares em um só lugar.",
        categoria:"gestao", icone:"📅", imagem:"", corPrimaria:"#4b3fa3", corSecundaria:"#6156c5",
        versao:"v1.0", autor:"Gibabit", responsavel:"Professor", url:"https://gibatdic.github.io/Edf/", tipo:"sistema_externo",
        status:"ativo", situacao:"publicado", publicado:true,
        destacar:{ mostrarHome:true, destaque:false, novo:false, beta:false },
        permissoes:["admin","professor","coordenador"], ordem:1, acessos:0,
        ultimaAtualizacao: nowIso(), dataCriacao: nowIso()
    },
    {
        id:"game-geo", nome:"Jogo Geolocalização", descricao:"Treino de coordenadas geográficas com revisão multidisciplinar.",
        descricaoCompleta:"Um jogo para praticar coordenadas geográficas com revisão multidisciplinar, pensado para engajar os alunos.",
        categoria:"educacao", icone:"🌍", imagem:"", corPrimaria:"#ff7a00", corSecundaria:"#ff9f4b",
        versao:"v1.2", autor:"Gibabit", responsavel:"Professor", url:"https://gibatdic.github.io/game-geolocation/", tipo:"aplicativo",
        status:"ativo", situacao:"publicado", publicado:true,
        destacar:{ mostrarHome:true, destaque:true, novo:false, beta:false },
        permissoes:["admin","professor","aluno","publico"], ordem:2, acessos:0,
        ultimaAtualizacao: nowIso(), dataCriacao: nowIso()
    },
    {
        id:"testes-avaliacoes", nome:"Testes e avaliações", descricao:"Monitoramento do desempenho individual e coletivo.",
        descricaoCompleta:"Monitoramento do desempenho individual e coletivo dos alunos, com testes e avaliações.",
        categoria:"avaliacao", icone:"📊", imagem:"", corPrimaria:"#378ade", corSecundaria:"#5da0ec",
        versao:"v0.1", autor:"Gibabit", responsavel:"Professor", url:"#", tipo:"pagina_interna",
        status:"inativo", situacao:"em_desenvolvimento", publicado:false,
        destacar:{ mostrarHome:true, destaque:false, novo:true, beta:true },
        permissoes:["admin","professor"], ordem:3, acessos:0,
        ultimaAtualizacao: nowIso(), dataCriacao: nowIso()
    },
    {
        id:"campeonato-interclasse", nome:"Campeonato Interclasses", descricao:"Gerenciador de torneios escolares.",
        descricaoCompleta:"Gerenciador completo de torneios e campeonatos interclasses da escola.",
        categoria:"esportes", icone:"🏆", imagem:"", corPrimaria:"#22c55e", corSecundaria:"#4ade80",
        versao:"v1.0", autor:"Gibabit", responsavel:"Professor", url:"https://gibatdic.github.io/campeonato-interclasse/", tipo:"sistema_externo",
        status:"ativo", situacao:"publicado", publicado:true,
        destacar:{ mostrarHome:true, destaque:false, novo:false, beta:false },
        permissoes:["admin","professor","coordenador","aluno"], ordem:4, acessos:0,
        ultimaAtualizacao: nowIso(), dataCriacao: nowIso()
    }
];

async function loadState() {
    try {
        const snap = await appsCol.get();
        if (snap.empty) {
            state.apps = DEFAULT_APPS;
            await saveApps();
        } else {
            state.apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    } catch (e) {
        console.error("Erro ao carregar aplicativos do Firestore:", e);
        state.apps = DEFAULT_APPS;
    }
    try {
        const snap = await catsCol.get();
        if (snap.empty) {
            state.categories = DEFAULT_CATEGORIES;
            await saveCats();
        } else {
            state.categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    } catch (e) {
        console.error("Erro ao carregar categorias do Firestore:", e);
        state.categories = DEFAULT_CATEGORIES;
    }

    state.favorites = loadLocal(STORAGE_FAVS, []);
    state.recent = loadLocal(STORAGE_RECENT, []);
    state.myUsage = loadLocal(STORAGE_MYUSAGE, {});

    renderAll();
}

async function saveApps() {
    try {
        const batch = db.batch();
        state.apps.forEach(a => {
            const { id, ...data } = a;
            batch.set(appsCol.doc(id), data);
        });
        await batch.commit();
    } catch (e) { console.error("Erro ao salvar aplicativos no Firestore:", e); }
}
async function saveCats() {
    try {
        const batch = db.batch();
        state.categories.forEach(c => {
            const { id, ...data } = c;
            batch.set(catsCol.doc(id), data);
        });
        await batch.commit();
    } catch (e) { console.error("Erro ao salvar categorias no Firestore:", e); }
}
async function saveFavs() { saveLocal(STORAGE_FAVS, state.favorites); }
async function saveRecent() { saveLocal(STORAGE_RECENT, state.recent); }
async function saveMyUsage() { saveLocal(STORAGE_MYUSAGE, state.myUsage); }

function catById(id) { return state.categories.find(c => c.id === id); }

function renderAll() {
    renderStats();
    renderChips();
    renderAdminPanel();
    renderFavorites();
    renderRecent();
    renderGrid();
    renderSelectionBar();
    renderAdminStatus();

    document.getElementById("btnNovoHeader").classList.toggle("hidden", !state.adminMode);
    document.getElementById("btnCategoriasHeader").classList.toggle("hidden", !state.adminMode);
    document.getElementById("visaoGeralWrap").classList.toggle("hidden", !state.adminMode);
}

function renderAdminStatus() {
    const wrap = document.getElementById("adminStatusWrap");
    if (state.adminMode && state.adminUser) {
        wrap.innerHTML = `
            <span style="font-size:13px;color:var(--slate-light);">👤 ${state.adminUser.email}</span>
            <button class="btn btn-ghost btn-sm" onclick="fazerLogoutAdmin()">Sair</button>
        `;
    } else {
        wrap.innerHTML = `<button class="btn btn-ghost btn-sm" onclick="abrirLoginAdmin()">Entrar como administrador</button>`;
    }
}

function abrirLoginAdmin() {
    state.loginError = "";
    const root = document.getElementById("modalRoot");
    root.innerHTML = `
        <div class="modal-overlay">
            <div class="modal" style="max-width:380px;">
                <div class="modal-header">
                    <h2>Login administrador</h2>
                    <button class="close-btn" onclick="closeWizard()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group"><label>E-mail</label><input type="email" id="admin_email"></div>
                    <div class="form-group"><label>Senha</label><input type="password" id="admin_senha"></div>
                    <p id="loginErrorMsg" style="color:var(--red); font-size:13px; display:${state.loginError ? 'block':'none'};">${state.loginError}</p>
                </div>
                <div class="modal-footer">
                    <div></div>
                    <div>
                        <button class="btn btn-ghost" onclick="closeWizard()">Cancelar</button>
                        <button class="btn btn-primary" onclick="fazerLoginAdmin()">Entrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function fazerLoginAdmin() {
    const email = document.getElementById("admin_email").value.trim();
    const senha = document.getElementById("admin_senha").value;
    try {
        await auth.signInWithEmailAndPassword(email, senha);
        // onAuthStateChanged cuida do resto (checar se é admin de verdade)
        closeWizard();
    } catch (e) {
        state.loginError = "E-mail ou senha incorretos.";
        abrirLoginAdmin();
    }
}

async function fazerLogoutAdmin() {
    await auth.signOut();
    state.adminMode = false;
    state.adminUser = null;
    state.reorderMode = false;
    state.selectionMode = null;
    renderAll();
}

// Assim que a página carrega, confere se já existe uma sessão (o
// Firebase Auth mantém isso sozinho entre visitas, sem precisar de
// nada manual). Só marca como admin de verdade se o UID também
// existir na coleção "admins" — login sozinho não basta.
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        state.adminMode = false;
        state.adminUser = null;
        renderAll();
        return;
    }
    try {
        const doc = await adminsCol.doc(user.uid).get();
        if (doc.exists) {
            state.adminMode = true;
            state.adminUser = user;
        } else {
            // Logou com Firebase, mas não é um admin cadastrado —
            // não libera o modo administrador.
            state.adminMode = false;
            state.adminUser = null;
        }
    } catch (e) {
        console.error("Erro ao verificar permissão de admin:", e);
        state.adminMode = false;
        state.adminUser = null;
    }
    renderAll();
});

function renderStats() {
    const total = state.apps.length;
    const ativos = state.apps.filter(a => a.status === "ativo").length;
    const cats = state.categories.length;
    let maisUsado = "-";
    const sorted = [...state.apps].sort((a,b) => (b.acessos||0) - (a.acessos||0));
    if (sorted.length && sorted[0].acessos > 0) maisUsado = sorted[0].nome;

    document.getElementById("statsRow").innerHTML = `
        <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">Aplicativos</div></div>
        <div class="stat-card"><div class="stat-num">${ativos}</div><div class="stat-label">Ativos</div></div>
        <div class="stat-card"><div class="stat-num">${cats}</div><div class="stat-label">Categorias</div></div>
        <div class="stat-card"><div class="stat-num" style="font-size:16px;">${maisUsado}</div><div class="stat-label">Mais utilizado</div></div>
    `;
}

function renderChips() {
    let html = `<div class="chip ${state.activeCategory==='all'?'active':''}" onclick="setCategory('all')">Todos</div>`;
    state.categories.forEach(c => {
        html += `<div class="chip ${state.activeCategory===c.id?'active':''}" onclick="setCategory('${c.id}')">${c.icone} ${c.nome}</div>`;
    });
    document.getElementById("chipsRow").innerHTML = html;
}

function setCategory(id) { state.activeCategory = id; renderChips(); renderGrid(); }

function renderAdminPanel() {
    const wrap = document.getElementById("adminPanelWrap");
    if (!state.adminMode) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = `
        <div class="section-title">Painel administrativo</div>
        <div class="admin-panel">
            <span class="admin-panel-label">Ações</span>
            <button class="btn btn-primary btn-sm" onclick="openWizard(null)">Novo Programa</button>
            <button class="btn btn-ghost btn-sm" onclick="openCategoriesModal()">Categorias</button>
            <button class="btn btn-ghost btn-sm" onclick="toggleReorder()">${state.reorderMode ? 'Concluir reordenação' : 'Reordenar'}</button>
            <button class="btn btn-ghost btn-sm" onclick="startSelection('publicar')">Publicar em lote</button>
            <button class="btn btn-ghost btn-sm" onclick="startSelection('arquivar')">Arquivar em lote</button>
        </div>
    `;
}

function toggleReorder() {
    state.reorderMode = !state.reorderMode;
    state.sortBy = "ordem";
    document.getElementById("sortSelect").value = "ordem";
    renderAdminPanel();
    renderGrid();
}

function startSelection(mode) {
    state.selectionMode = mode;
    state.selectedIds = new Set();
    renderGrid();
    renderSelectionBar();
}

function cancelSelection() {
    state.selectionMode = null;
    state.selectedIds = new Set();
    renderGrid();
    renderSelectionBar();
}

function toggleSelected(id) {
    if (state.selectedIds.has(id)) state.selectedIds.delete(id); else state.selectedIds.add(id);
    renderSelectionBar();
    renderGrid();
}

async function applySelection() {
    const status = state.selectionMode === 'publicar' ? 'publicado' : 'arquivado';
    state.apps.forEach(a => {
        if (state.selectedIds.has(a.id)) {
            a.situacao = status;
            a.publicado = status === 'publicado';
            a.status = status === 'arquivado' ? 'inativo' : a.status;
            a.ultimaAtualizacao = nowIso();
        }
    });
    await saveApps();
    cancelSelection();
    renderAll();
}

function renderSelectionBar() {
    const root = document.getElementById("selectionBarRoot");
    if (!state.selectionMode) { root.innerHTML = ""; return; }
    const label = state.selectionMode === 'publicar' ? 'Publicar' : 'Arquivar';
    root.innerHTML = `
        <div class="selection-bar">
            <span>${state.selectedIds.size} selecionado(s)</span>
            <button class="btn btn-primary btn-sm" onclick="applySelection()">${label}</button>
            <button class="btn btn-ghost btn-sm" onclick="cancelSelection()">Cancelar</button>
        </div>
    `;
}

function renderFavorites() {
    const wrap = document.getElementById("favoritesWrap");
    const favApps = state.apps.filter(a => state.favorites.includes(a.id));
    if (!favApps.length) { wrap.innerHTML = ""; return; }
    let html = `<div class="section-title">&#9733; Favoritos</div><div class="mini-row">`;
    favApps.forEach(a => {
        html += `<div class="mini-card" onclick="openApp('${a.id}')">
            <span class="mini-icon">${a.icone}</span>
            <div><div class="mini-name">${a.nome}</div><div class="mini-sub">${catById(a.categoria) ? catById(a.categoria).nome : ''}</div></div>
        </div>`;
    });
    html += `</div>`;
    wrap.innerHTML = html;
}

function renderRecent() {
    const wrap = document.getElementById("recentWrap");
    const items = [...state.recent].sort((a,b) => b.ts - a.ts).slice(0,5);
    const apps = items.map(r => state.apps.find(a => a.id === r.id)).filter(Boolean);
    if (!apps.length) { wrap.innerHTML = ""; return; }
    let html = `<div class="section-title">Continuar de onde parei</div><div class="mini-row">`;
    apps.forEach(a => {
        html += `<div class="mini-card" onclick="openApp('${a.id}')">
            <span class="mini-icon">${a.icone}</span>
            <div><div class="mini-name">${a.nome}</div><div class="mini-sub">${catById(a.categoria) ? catById(a.categoria).nome : ''}</div></div>
        </div>`;
    });
    html += `</div>`;
    wrap.innerHTML = html;
}

function getFilteredSortedApps() {
    let list = [...state.apps];

    // Visitante comum só vê o que está publicado. Admin vê tudo (pra
    // conseguir gerenciar rascunhos, itens em desenvolvimento etc.)
    if (!state.adminMode) {
        list = list.filter(a => a.situacao === "publicado");
    }

    if (state.activeCategory !== 'all') list = list.filter(a => a.categoria === state.activeCategory);
    if (state.search.trim()) {
        const q = state.search.trim().toLowerCase();
        list = list.filter(a =>
            a.nome.toLowerCase().includes(q) ||
            (catById(a.categoria) && catById(a.categoria).nome.toLowerCase().includes(q)) ||
            (a.descricao||"").toLowerCase().includes(q) ||
            (a.autor||"").toLowerCase().includes(q)
        );
    }
    const favSet = new Set(state.favorites);
    list.sort((a,b) => {
        const favDiff = (favSet.has(b.id)?1:0) - (favSet.has(a.id)?1:0);
        if (favDiff !== 0) return favDiff;
        switch (state.sortBy) {
            case "nome": return a.nome.localeCompare(b.nome);
            case "categoria": return (catById(a.categoria)?.nome||"").localeCompare(catById(b.categoria)?.nome||"");
            case "data": return new Date(b.ultimaAtualizacao) - new Date(a.ultimaAtualizacao);
            case "acessos": return (b.acessos||0) - (a.acessos||0);
            case "meus": return (state.myUsage[b.id]||0) - (state.myUsage[a.id]||0);
            default: return (a.ordem||0) - (b.ordem||0);
        }
    });
    return list;
}

function statusLabel(s) {
    return { publicado:"Publicado", rascunho:"Rascunho", em_desenvolvimento:"Em desenvolvimento", arquivado:"Arquivado" }[s] || s;
}

function renderGrid() {
    const list = getFilteredSortedApps();
    const grid = document.getElementById("cardsGrid");
    if (!list.length) {
        grid.innerHTML = `<div class="empty-state">Nenhum aplicativo encontrado. ${state.adminMode ? 'Clique em "Novo Programa" para cadastrar o primeiro.' : ''}</div>`;
        return;
    }
    const favSet = new Set(state.favorites);
    grid.innerHTML = list.map(a => {
        const cat = catById(a.categoria);
        const isFav = favSet.has(a.id);
        const isSelected = state.selectedIds.has(a.id);
        return `
        <div class="app-card" draggable="${state.reorderMode}" data-id="${a.id}"
             ondragstart="onDragStart(event,'${a.id}')" ondragover="onDragOver(event)" ondrop="onDrop(event,'${a.id}')">
            ${state.selectionMode ? `<input type="checkbox" class="select-checkbox" ${isSelected?'checked':''} onchange="toggleSelected('${a.id}')">` : ''}
            <div class="app-card-top" style="${state.selectionMode ? 'margin-left:26px;' : ''}">
                <div class="app-icon" style="background:linear-gradient(135deg, ${a.corPrimaria||'#334155'}, ${a.corSecundaria||'#475569'});">${a.icone || '📦'}</div>
                <div class="app-card-right">
                    <button class="star-btn ${isFav?'active':''}" onclick="toggleFavorite('${a.id}')" title="Favoritar">&#9733;</button>
                    ${state.adminMode ? `
                    <div class="menu-wrap">
                        <button class="menu-btn" onclick="toggleMenu('${a.id}')">&#8942;</button>
                        ${state.openMenuId === a.id ? `
                        <div class="dropdown">
                            <button onclick="openWizard('${a.id}')">Editar</button>
                            <button onclick="duplicateApp('${a.id}')">Duplicar</button>
                            <button onclick="toggleArchive('${a.id}')">${a.situacao==='arquivado' ? 'Republicar' : 'Arquivar'}</button>
                            <button class="danger-item" onclick="deleteApp('${a.id}')">Excluir</button>
                        </div>` : ''}
                    </div>` : ''}
                </div>
            </div>
            <div class="app-name">${a.nome}</div>
            <div class="app-desc">${a.descricao || ''}</div>
            <div class="badges-row">
                <span class="badge badge-cat">${cat ? cat.icone + ' ' + cat.nome : 'Sem categoria'}</span>
                <span class="badge badge-status-${a.situacao}">${statusLabel(a.situacao)}</span>
                ${a.destacar && a.destacar.novo ? '<span class="badge" style="background:rgba(255,122,0,0.15);color:var(--orange-glow);">Novo</span>' : ''}
                ${a.destacar && a.destacar.beta ? '<span class="badge" style="background:rgba(148,163,184,0.15);color:var(--slate-light);">Beta</span>' : ''}
            </div>
            <div class="app-meta">
                <span><span class="dot dot-${a.status}"></span>${a.status === 'ativo' ? 'Ativo' : 'Inativo'} · v${a.versao || '1.0'}</span>
                <span>Atualizado em ${fmtDate(a.ultimaAtualizacao)}</span>
            </div>
            <div class="app-footer">
                <span style="font-size:11px;color:var(--slate-light);">${a.acessos||0} acessos</span>
                <button class="open-btn" onclick="openApp('${a.id}')">Abrir</button>
            </div>
        </div>`;
    }).join("");
}

function toggleMenu(id) {
    state.openMenuId = state.openMenuId === id ? null : id;
    renderGrid();
}

document.addEventListener("click", function(e){
    if (!e.target.closest(".menu-wrap") && state.openMenuId) {
        state.openMenuId = null;
        renderGrid();
    }
});

async function toggleFavorite(id) {
    if (state.favorites.includes(id)) {
        state.favorites = state.favorites.filter(f => f !== id);
    } else {
        state.favorites.push(id);
    }
    await saveFavs();
    renderAll();
}

async function openApp(id) {
    const app = state.apps.find(a => a.id === id);
    if (!app) return;

    app.acessos = (app.acessos || 0) + 1;

    // Incremento direto e específico (não reescreve o app inteiro) —
    // bate com a regra do Firestore que só libera esse campo pra
    // quem não é admin.
    try {
        await appsCol.doc(id).update({ acessos: firebase.firestore.FieldValue.increment(1) });
    } catch (e) {
        console.error("Erro ao registrar acesso:", e);
    }

    state.myUsage[id] = (state.myUsage[id] || 0) + 1;
    await saveMyUsage();

    state.recent = state.recent.filter(r => r.id !== id);
    state.recent.unshift({ id, ts: Date.now() });
    state.recent = state.recent.slice(0, 10);
    await saveRecent();

    renderAll();

    if (app.url && app.url !== "#") {
        window.open(construirUrlComEmail(app.url), "_blank");
    } else {
        alert(app.nome + " ainda não possui uma URL configurada.");
    }
}

// Anexa o e-mail do admin logado como parâmetro na URL, pra que o
// sistema de destino (ex: SAFE) já preencha o campo de e-mail no
// login dele, poupando uma digitação. NÃO é autenticação nenhuma —
// é só uma conveniência de preenchimento, o outro sistema continua
// pedindo a senha normalmente. Só faz isso se tiver um admin logado
// (visitante anônimo não tem e-mail pra passar).
function construirUrlComEmail(urlBase) {
    if (!state.adminUser || !state.adminUser.email) {
        return urlBase;
    }
    try {
        const url = new URL(urlBase);
        url.searchParams.set("email", state.adminUser.email);
        return url.toString();
    } catch (e) {
        // URL relativa ou inválida pro construtor URL — devolve como veio
        return urlBase;
    }
}

async function duplicateApp(id) {
    const app = state.apps.find(a => a.id === id);
    if (!app) return;
    const copy = JSON.parse(JSON.stringify(app));
    copy.id = uid();
    copy.nome = app.nome + " (cópia)";
    copy.situacao = "rascunho";
    copy.publicado = false;
    copy.ordem = state.apps.length + 1;
    copy.acessos = 0;
    copy.dataCriacao = nowIso();
    copy.ultimaAtualizacao = nowIso();
    state.apps.push(copy);
    state.openMenuId = null;
    await saveApps();
    renderAll();
}

async function toggleArchive(id) {
    const app = state.apps.find(a => a.id === id);
    if (!app) return;
    if (app.situacao === 'arquivado') {
        app.situacao = 'publicado';
        app.publicado = true;
    } else {
        app.situacao = 'arquivado';
        app.publicado = false;
        app.status = 'inativo';
    }
    app.ultimaAtualizacao = nowIso();
    state.openMenuId = null;
    await saveApps();
    renderAll();
}

async function deleteApp(id) {
    const app = state.apps.find(a => a.id === id);
    if (!app) return;
    if (!confirm('Excluir "' + app.nome + '" permanentemente?')) return;
    state.apps = state.apps.filter(a => a.id !== id);
    state.openMenuId = null;
    try { await appsCol.doc(id).delete(); } catch (e) { console.error("Erro ao excluir no Firestore:", e); }
    renderAll();
}

/* drag and drop reorder */
let dragSourceId = null;
function onDragStart(e, id) {
    if (!state.reorderMode) { e.preventDefault(); return; }
    dragSourceId = id;
    e.target.classList.add("dragging");
}
function onDragOver(e) { if (state.reorderMode) e.preventDefault(); }
async function onDrop(e, targetId) {
    if (!state.reorderMode || !dragSourceId || dragSourceId === targetId) return;
    e.preventDefault();
    const list = getFilteredSortedApps();
    const ids = list.map(a => a.id);
    const from = ids.indexOf(dragSourceId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, dragSourceId);
    ids.forEach((id, i) => {
        const app = state.apps.find(a => a.id === id);
        if (app) app.ordem = i + 1;
    });
    dragSourceId = null;
    await saveApps();
    renderGrid();
}

/* ===== search / sort ===== */
document.getElementById("searchInput").addEventListener("input", (e) => {
    state.search = e.target.value;
    renderGrid();
});
document.getElementById("sortSelect").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    renderGrid();
});

/* ===== WIZARD (create / edit) ===== */
const WIZARD_STEPS = ["Informações", "Aparência", "Permissões", "Navegação", "Publicação"];

function blankApp() {
    return {
        id: null, nome:"", descricao:"", descricaoCompleta:"", categoria: state.categories[0]?.id || "",
        versao:"1.0", autor:"", responsavel:"",
        icone:"📦", imagem:"", corPrimaria:"#ff7a00", corSecundaria:"#ff9f4b",
        permissoes: [], url:"", tipo:"pagina_interna",
        status:"ativo", situacao:"rascunho", publicado:false,
        destacar:{ mostrarHome:true, destaque:false, novo:false, beta:false }
    };
}

function openWizard(id) {
    state.openMenuId = null;
    const existing = id ? state.apps.find(a => a.id === id) : null;
    state.wizard = { step:0, isEdit: !!existing, draft: existing ? JSON.parse(JSON.stringify(existing)) : blankApp() };
    renderWizard();
}

function closeWizard() {
    state.wizard = null;
    document.getElementById("modalRoot").innerHTML = "";
}

function renderWizard() {
    const w = state.wizard;
    const root = document.getElementById("modalRoot");
    root.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h2>${w.isEdit ? 'Editar programa' : 'Novo programa'}</h2>
                    <button class="close-btn" onclick="closeWizard()">&times;</button>
                </div>
                <div class="stepper">
                    ${WIZARD_STEPS.map((label,i) => `<div class="step-dot ${i===w.step?'active':(i<w.step?'done':'')}">${i+1}. ${label}</div>`).join("")}
                </div>
                <div class="modal-body" id="wizardBody"></div>
                <div class="modal-footer">
                    <div>${w.step > 0 ? `<button class="btn btn-ghost" onclick="wizardBack()">Voltar</button>` : ''}</div>
                    <div>
                        <button class="btn btn-ghost" onclick="closeWizard()">Cancelar</button>
                        ${w.step < 4 ? `<button class="btn btn-primary" onclick="wizardNext()">Próximo</button>` : `<button class="btn btn-primary" onclick="saveWizard()">Salvar</button>`}
                    </div>
                </div>
            </div>
        </div>
    `;
    renderWizardStep();
}

function renderWizardStep() {
    const w = state.wizard;
    const d = w.draft;
    const body = document.getElementById("wizardBody");
    if (w.step === 0) {
        body.innerHTML = `
            <div class="form-group"><label>Nome do programa *</label><input type="text" id="f_nome" value="${escapeAttr(d.nome)}"></div>
            <div class="form-group"><label>Descrição curta</label><input type="text" id="f_descricao" value="${escapeAttr(d.descricao)}"></div>
            <div class="form-group"><label>Descrição completa</label><textarea id="f_descricaoCompleta">${d.descricaoCompleta||''}</textarea></div>
            <div class="form-row">
                <div class="form-group"><label>Categoria</label>
                    <select id="f_categoria">${state.categories.map(c => `<option value="${c.id}" ${c.id===d.categoria?'selected':''}>${c.icone} ${c.nome}</option>`).join("")}</select>
                </div>
                <div class="form-group"><label>Versão</label><input type="text" id="f_versao" value="${escapeAttr(d.versao)}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Autor</label><input type="text" id="f_autor" value="${escapeAttr(d.autor)}"></div>
                <div class="form-group"><label>Responsável</label><input type="text" id="f_responsavel" value="${escapeAttr(d.responsavel)}"></div>
            </div>
        `;
    } else if (w.step === 1) {
        body.innerHTML = `
            <div class="form-group"><label>Ícone (emoji)</label><input type="text" id="f_icone" value="${escapeAttr(d.icone)}" maxlength="4"></div>
            <div class="form-group"><label>Imagem de capa (URL, opcional)</label><input type="url" id="f_imagem" value="${escapeAttr(d.imagem)}"></div>
            <div class="form-row">
                <div class="form-group"><label>Cor principal</label><input type="color" class="color-input" id="f_corPrimaria" value="${d.corPrimaria}"></div>
                <div class="form-group"><label>Cor secundária</label><input type="color" class="color-input" id="f_corSecundaria" value="${d.corSecundaria}"></div>
            </div>
        `;
    } else if (w.step === 2) {
        const perfis = [["admin","Administrador"],["professor","Professor"],["coordenador","Coordenador"],["aluno","Aluno"],["publico","Público"]];
        body.innerHTML = `
            <label style="display:block;font-size:13px;color:var(--slate-light);margin-bottom:10px;">Quem pode acessar?</label>
            ${perfis.map(([val,label]) => `
                <div class="checkbox-line">
                    <input type="checkbox" id="f_perm_${val}" ${d.permissoes.includes(val)?'checked':''}>
                    <label for="f_perm_${val}" style="margin:0;color:white;">${label}</label>
                </div>
            `).join("")}
        `;
    } else if (w.step === 3) {
        body.innerHTML = `
            <div class="form-group"><label>URL do sistema</label><input type="text" id="f_url" value="${escapeAttr(d.url)}" placeholder="https://... ou # se ainda não existir"></div>
            <div class="form-group"><label>Tipo</label>
                <select id="f_tipo">
                    <option value="pagina_interna" ${d.tipo==='pagina_interna'?'selected':''}>Página interna</option>
                    <option value="sistema_externo" ${d.tipo==='sistema_externo'?'selected':''}>Sistema externo</option>
                    <option value="link" ${d.tipo==='link'?'selected':''}>Link</option>
                    <option value="aplicativo" ${d.tipo==='aplicativo'?'selected':''}>Aplicativo</option>
                </select>
            </div>
        `;
    } else if (w.step === 4) {
        body.innerHTML = `
            <div class="form-group"><label>Status operacional</label>
                <select id="f_status">
                    <option value="ativo" ${d.status==='ativo'?'selected':''}>Ativo</option>
                    <option value="inativo" ${d.status==='inativo'?'selected':''}>Inativo</option>
                </select>
            </div>
            <div class="form-group"><label>Situação de publicação</label>
                <select id="f_situacao">
                    <option value="publicado" ${d.situacao==='publicado'?'selected':''}>Publicado</option>
                    <option value="rascunho" ${d.situacao==='rascunho'?'selected':''}>Rascunho</option>
                    <option value="em_desenvolvimento" ${d.situacao==='em_desenvolvimento'?'selected':''}>Em desenvolvimento</option>
                    <option value="arquivado" ${d.situacao==='arquivado'?'selected':''}>Arquivado</option>
                </select>
            </div>
            <label style="display:block;font-size:13px;color:var(--slate-light);margin:14px 0 10px;">Destaque</label>
            <div class="checkbox-line"><input type="checkbox" id="f_dest_home" ${d.destacar.mostrarHome?'checked':''}><label style="margin:0;color:white;">Mostrar na Home</label></div>
            <div class="checkbox-line"><input type="checkbox" id="f_dest_destaque" ${d.destacar.destaque?'checked':''}><label style="margin:0;color:white;">Programa em destaque</label></div>
            <div class="checkbox-line"><input type="checkbox" id="f_dest_novo" ${d.destacar.novo?'checked':''}><label style="margin:0;color:white;">Novo</label></div>
            <div class="checkbox-line"><input type="checkbox" id="f_dest_beta" ${d.destacar.beta?'checked':''}><label style="margin:0;color:white;">Beta</label></div>
        `;
    }
}

function escapeAttr(s) { return (s||"").replace(/"/g,'&quot;'); }

function collectStep() {
    const w = state.wizard;
    const d = w.draft;
    if (w.step === 0) {
        d.nome = document.getElementById("f_nome").value.trim();
        d.descricao = document.getElementById("f_descricao").value.trim();
        d.descricaoCompleta = document.getElementById("f_descricaoCompleta").value.trim();
        d.categoria = document.getElementById("f_categoria").value;
        d.versao = document.getElementById("f_versao").value.trim();
        d.autor = document.getElementById("f_autor").value.trim();
        d.responsavel = document.getElementById("f_responsavel").value.trim();
    } else if (w.step === 1) {
        d.icone = document.getElementById("f_icone").value.trim() || "📦";
        d.imagem = document.getElementById("f_imagem").value.trim();
        d.corPrimaria = document.getElementById("f_corPrimaria").value;
        d.corSecundaria = document.getElementById("f_corSecundaria").value;
    } else if (w.step === 2) {
        const perfis = ["admin","professor","coordenador","aluno","publico"];
        d.permissoes = perfis.filter(p => document.getElementById("f_perm_"+p).checked);
    } else if (w.step === 3) {
        d.url = document.getElementById("f_url").value.trim();
        d.tipo = document.getElementById("f_tipo").value;
    } else if (w.step === 4) {
        d.status = document.getElementById("f_status").value;
        d.situacao = document.getElementById("f_situacao").value;
        d.publicado = d.situacao === "publicado";
        d.destacar = {
            mostrarHome: document.getElementById("f_dest_home").checked,
            destaque: document.getElementById("f_dest_destaque").checked,
            novo: document.getElementById("f_dest_novo").checked,
            beta: document.getElementById("f_dest_beta").checked
        };
    }
}

function wizardNext() {
    collectStep();
    if (state.wizard.step === 0 && !state.wizard.draft.nome) {
        alert("Informe o nome do programa antes de continuar.");
        return;
    }
    state.wizard.step++;
    renderWizard();
}
function wizardBack() {
    collectStep();
    state.wizard.step--;
    renderWizard();
}

async function saveWizard() {
    collectStep();
    const w = state.wizard;
    const d = w.draft;
    if (!d.nome) { alert("Informe o nome do programa."); state.wizard.step = 0; renderWizard(); return; }

    if (w.isEdit) {
        const idx = state.apps.findIndex(a => a.id === d.id);
        d.ultimaAtualizacao = nowIso();
        state.apps[idx] = d;
    } else {
        d.id = uid();
        d.ordem = state.apps.length + 1;
        d.acessos = 0;
        d.dataCriacao = nowIso();
        d.ultimaAtualizacao = nowIso();
        state.apps.push(d);
    }
    await saveApps();
    closeWizard();
    renderAll();
}

/* ===== CATEGORIES MODAL ===== */
function openCategoriesModal() {
    renderCategoriesModal();
}

function renderCategoriesModal() {
    const root = document.getElementById("modalRoot");
    root.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h2>Categorias</h2>
                    <button class="close-btn" onclick="closeWizard()">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="catList"></div>
                    <div class="section-title" style="margin-top:20px;">Nova categoria</div>
                    <div class="form-row">
                        <div class="form-group"><label>Nome</label><input type="text" id="cat_nome"></div>
                        <div class="form-group"><label>Ícone (emoji)</label><input type="text" id="cat_icone" maxlength="4"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Cor</label><input type="color" class="color-input" id="cat_cor" value="#ff7a00"></div>
                        <div class="form-group"><label>Descrição</label><input type="text" id="cat_descricao"></div>
                    </div>
                    <button class="btn btn-primary" onclick="addCategory()">Adicionar categoria</button>
                </div>
                <div class="modal-footer">
                    <div></div>
                    <button class="btn btn-ghost" onclick="closeWizard()">Fechar</button>
                </div>
            </div>
        </div>
    `;
    renderCatList();
}

function renderCatList() {
    const el = document.getElementById("catList");
    el.innerHTML = state.categories.map(c => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-soft);">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:20px;">${c.icone}</span>
                <div>
                    <div style="font-weight:bold;">${c.nome}</div>
                    <div style="font-size:12px;color:var(--slate-light);">${c.descricao||''}</div>
                </div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c.id}')">Excluir</button>
        </div>
    `).join("");
}

async function addCategory() {
    const nome = document.getElementById("cat_nome").value.trim();
    if (!nome) { alert("Informe o nome da categoria."); return; }
    const icone = document.getElementById("cat_icone").value.trim() || "📁";
    const cor = document.getElementById("cat_cor").value;
    const descricao = document.getElementById("cat_descricao").value.trim();
    state.categories.push({ id: uid(), nome, icone, cor, descricao });
    await saveCats();
    renderCatList();
    renderChips();
}

async function deleteCategory(id) {
    if (state.apps.some(a => a.categoria === id)) {
        if (!confirm("Existem aplicativos nessa categoria. Excluir mesmo assim?")) return;
    }
    state.categories = state.categories.filter(c => c.id !== id);
    try { await catsCol.doc(id).delete(); } catch (e) { console.error("Erro ao excluir categoria no Firestore:", e); }
    renderCatList();
    renderAll();
}

loadState();
