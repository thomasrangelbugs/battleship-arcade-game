const LEVELS = {
    facil: {
        nome: "Fácil",
        frota: [1, 1, 1, 2, 2, 3],
        municaoBase: 28,
    },
    medio: {
        nome: "Médio",
        frota: [1, 1, 1, 1, 2, 2, 2, 3, 3],
        municaoBase: 22,
    },
    dificil: {
        nome: "Difícil",
        frota: [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3],
        municaoBase: 16,
    },
};

const dom = {
    setupPanel: document.getElementById("setupPanel"),
    gamePanel: document.getElementById("gamePanel"),
    tabuleiroWrap: document.getElementById("tabuleiroWrap"),
    tabuleiro: document.getElementById("tabuleiro"),
    mensagemStatus: document.getElementById("mensagemStatus"),
    inputTamanho: document.getElementById("tamanho"),
    inputMunicao: document.getElementById("municao"),
    selectNivel: document.getElementById("nivel"),
    btnIniciar: document.getElementById("btnIniciar"),
    btnNovoJogo: document.getElementById("btnNovoJogo"),
    btnVoltarMenu: document.getElementById("btnVoltarMenu"),
    menuReiniciar: document.getElementById("menuReiniciar"),
    hudMunicao: document.getElementById("hudMunicao"),
    hudNavios: document.getElementById("hudNavios"),
    hudAcertos: document.getElementById("hudAcertos"),
    hudErros: document.getElementById("hudErros"),
    videoOverlay: document.getElementById("videoOverlay"),
    videoTitulo: document.getElementById("videoTitulo"),
    videoResultado: document.getElementById("videoResultado"),
    btnPularVideo: document.getElementById("btnPularVideo"),
};

const state = {
    tamanho: 0,
    nivel: "medio",
    municao: 0,
    acertos: 0,
    erros: 0,
    naviosRestantes: 0,
    celulasDeNavioRestantes: 0,
    ativo: false,
    finalizado: false,
    bloqueadoPorVideo: false,
    board: [],
    ships: [],
    buttons: [],
};

let municaoEditadaManualmente = false;
let fecharVideoAtivo = null;

function emitirEstado(phase) {
    document.dispatchEvent(new CustomEvent("bn:state", { detail: { phase } }));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function inteiroAleatorio(maxExclusive) {
    return Math.floor(Math.random() * maxExclusive);
}

function playSfx(path, volume = 1) {
    try {
        const audio = new Audio(path);
        audio.volume = volume;
        audio.play().catch(() => {});
    } catch (_error) {
        // Silencia falhas de autoplay.
    }
}

function setStatus(message, type = "info") {
    dom.mensagemStatus.textContent = message;
    dom.mensagemStatus.classList.remove("is-info", "is-success", "is-danger", "is-warning");
    dom.mensagemStatus.classList.add(`is-${type}`);
}

function atualizarHud() {
    dom.hudMunicao.textContent = String(state.municao);
    dom.hudNavios.textContent = String(state.naviosRestantes);
    dom.hudAcertos.textContent = String(state.acertos);
    dom.hudErros.textContent = String(state.erros);
}

function sugerirMunicao() {
    const nivel = dom.selectNivel.value;
    const tamanho = clamp(parseInt(dom.inputTamanho.value, 10) || 8, 5, 12);
    const base = LEVELS[nivel]?.municaoBase ?? 24;
    const bonusTamanho = Math.max(0, tamanho - 8) * 2;
    const sugerida = clamp(base + bonusTamanho, 10, 99);

    dom.inputMunicao.placeholder = String(sugerida);
    if (!municaoEditadaManualmente || !dom.inputMunicao.value) {
        dom.inputMunicao.value = String(sugerida);
    }
}

function criarMatriz(tamanho) {
    return Array.from({ length: tamanho }, () =>
        Array.from({ length: tamanho }, () => ({
            tiro: false,
            shipId: null,
        }))
    );
}

function montarFrota(tamanho, nivel) {
    const nivelConfig = LEVELS[nivel] ?? LEVELS.medio;
    const frotaBase = nivelConfig.frota.filter((comprimento) => comprimento <= tamanho);
    const frota = frotaBase.length > 0 ? frotaBase : [1, 1, 1];

    for (let tentativaGlobal = 0; tentativaGlobal < 35; tentativaGlobal++) {
        const board = criarMatriz(tamanho);
        const ships = [];
        let falhou = false;

        for (const comprimento of frota) {
            let posicionado = false;

            for (let tentativa = 0; tentativa < 600; tentativa++) {
                const horizontal = Math.random() < 0.5;
                const maxLinha = horizontal ? tamanho : tamanho - comprimento + 1;
                const maxColuna = horizontal ? tamanho - comprimento + 1 : tamanho;

                const linhaInicial = inteiroAleatorio(maxLinha);
                const colunaInicial = inteiroAleatorio(maxColuna);

                const cells = [];
                let livre = true;

                for (let i = 0; i < comprimento; i++) {
                    const linha = linhaInicial + (horizontal ? 0 : i);
                    const coluna = colunaInicial + (horizontal ? i : 0);

                    if (board[linha][coluna].shipId !== null) {
                        livre = false;
                        break;
                    }

                    cells.push({ linha, coluna });
                }

                if (!livre) {
                    continue;
                }

                const shipId = ships.length;
                for (const cell of cells) {
                    board[cell.linha][cell.coluna].shipId = shipId;
                }

                ships.push({
                    id: shipId,
                    comprimento,
                    cells,
                    hits: 0,
                    afundado: false,
                });

                posicionado = true;
                break;
            }

            if (!posicionado) {
                falhou = true;
                break;
            }
        }

        if (!falhou) {
            return { board, ships };
        }
    }

    return null;
}

function calcularTamanhoCelula() {
    if (!state.tamanho) {
        return;
    }

    const larguraDisponivel = Math.max(240, dom.tabuleiroWrap.clientWidth - 20);
    const alturaJanela = window.innerHeight || 900;
    const reservaAltura = window.innerWidth <= 640 ? 410 : 360;
    const alturaDisponivel = Math.max(240, alturaJanela - reservaAltura);

    const porLargura = Math.floor(larguraDisponivel / state.tamanho) - 4;
    const porAltura = Math.floor(alturaDisponivel / state.tamanho) - 4;
    const tamanhoCalculado = clamp(Math.min(porLargura, porAltura, 84), 34, 86);

    document.documentElement.style.setProperty("--cell-size", `${tamanhoCalculado}px`);
    dom.tabuleiro.style.gridTemplateColumns = `repeat(${state.tamanho}, var(--cell-size))`;
}

function desabilitarTabuleiro() {
    for (const linha of state.buttons) {
        for (const botao of linha) {
            botao.disabled = true;
            botao.classList.add("ja-jogada");
        }
    }
}

function revelarNaviosRestantes() {
    for (let linha = 0; linha < state.tamanho; linha++) {
        for (let coluna = 0; coluna < state.tamanho; coluna++) {
            const cell = state.board[linha][coluna];
            if (cell.shipId !== null && !cell.tiro) {
                state.buttons[linha][coluna].classList.add("revelado");
            }
        }
    }
}

function renderizarTabuleiro() {
    dom.tabuleiro.innerHTML = "";
    state.buttons = [];

    for (let linha = 0; linha < state.tamanho; linha++) {
        const linhaBotoes = [];

        for (let coluna = 0; coluna < state.tamanho; coluna++) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "celula";
            button.dataset.linha = String(linha);
            button.dataset.coluna = String(coluna);
            button.setAttribute("aria-label", `Linha ${linha + 1}, coluna ${coluna + 1}`);

            button.addEventListener("click", () => processarJogada(linha, coluna, button));
            dom.tabuleiro.appendChild(button);
            linhaBotoes.push(button);
        }

        state.buttons.push(linhaBotoes);
    }

    calcularTamanhoCelula();
}

function fecharVideo() {
    if (typeof fecharVideoAtivo === "function") {
        dom.btnPularVideo.removeEventListener("click", fecharVideoAtivo);
        dom.videoResultado.removeEventListener("ended", fecharVideoAtivo);
        dom.videoResultado.removeEventListener("error", fecharVideoAtivo);
        fecharVideoAtivo = null;
    }

    dom.videoResultado.pause();
    dom.videoResultado.removeAttribute("src");
    dom.videoResultado.load();
    dom.videoOverlay.classList.add("hidden");
}

function abrirVideoOverlay(src, titulo, { textoBotao = "Continuar", onClose = null } = {}) {
    fecharVideo();
    dom.videoTitulo.textContent = titulo;
    dom.btnPularVideo.textContent = textoBotao;
    dom.videoResultado.src = src;
    dom.videoOverlay.classList.remove("hidden");
    dom.videoResultado.currentTime = 0;

    const concluir = () => {
        if (dom.videoOverlay.classList.contains("hidden")) {
            return;
        }

        const callback = onClose;
        fecharVideo();
        if (typeof callback === "function") {
            callback();
        }
    };

    fecharVideoAtivo = concluir;
    dom.btnPularVideo.addEventListener("click", concluir);
    dom.videoResultado.addEventListener("ended", concluir);
    dom.videoResultado.addEventListener("error", concluir);

    dom.videoResultado.play().catch(() => {
        // Falha de autoplay: o jogador ainda pode continuar pelo botão.
    });
}

function abrirVideoAcerto(onClose) {
    state.bloqueadoPorVideo = true;
    abrirVideoOverlay("videos/acerto.mp4", "Acerto explosivo", {
        textoBotao: "Continuar ataque",
        onClose: () => {
            state.bloqueadoPorVideo = false;
            if (typeof onClose === "function") {
                onClose();
            }
        },
    });
}

function abrirVideoFinal(src, titulo) {
    abrirVideoOverlay(src, titulo, { textoBotao: "Continuar" });
}

function encerrarPartida(vitoria) {
    state.ativo = false;
    state.finalizado = true;
    state.bloqueadoPorVideo = false;

    desabilitarTabuleiro();

    if (vitoria) {
        setStatus("Vitória! Você destruiu toda a frota inimiga.", "success");
        playSfx("audios/vitoria.mp3", 1);
        abrirVideoFinal("videos/vitoria.mp4", "Você venceu");
    } else {
        revelarNaviosRestantes();
        setStatus("Sem munição. Missão encerrada.", "danger");
        playSfx("audios/derrota.mp3", 1);
        abrirVideoFinal("videos/gameover.mp4", "Game over");
    }

    emitirEstado("end");
}

function processarJogada(linha, coluna, button) {
    if (!state.ativo || state.finalizado || state.bloqueadoPorVideo) {
        return;
    }

    const cell = state.board[linha][coluna];
    if (cell.tiro) {
        setStatus("Essa coordenada já foi utilizada.", "warning");
        return;
    }

    cell.tiro = true;
    state.municao -= 1;

    button.classList.add("ja-jogada");
    button.disabled = true;

    playSfx("audios/clique.mp3", 0.7);

    if (cell.shipId !== null) {
        state.acertos += 1;
        state.celulasDeNavioRestantes -= 1;
        button.classList.add("acerto");
        playSfx("audios/explosao.mp3", 0.95);

        const ship = state.ships[cell.shipId];
        ship.hits += 1;

        if (!ship.afundado && ship.hits >= ship.comprimento) {
            ship.afundado = true;
            state.naviosRestantes -= 1;
            setStatus(`Navio afundado. Restam ${state.naviosRestantes}.`, "success");
        } else {
            setStatus("Acerto confirmado.", "success");
        }
    } else {
        state.erros += 1;
        button.classList.add("erro");
        playSfx("audios/agua.mp3", 0.85);
        setStatus("Água. Ajuste a mira.", "info");
    }

    atualizarHud();

    if (cell.shipId !== null) {
        abrirVideoAcerto(() => {
            if (state.celulasDeNavioRestantes <= 0) {
                encerrarPartida(true);
                return;
            }

            if (state.municao <= 0) {
                encerrarPartida(false);
                return;
            }

            if (state.municao <= 3) {
                setStatus(`Atenção: só restam ${state.municao} tiros.`, "warning");
            }
        });
        return;
    }

    if (state.municao <= 0) {
        encerrarPartida(false);
        return;
    }

    if (state.municao <= 3) {
        setStatus(`Atenção: só restam ${state.municao} tiros.`, "warning");
    }
}

function iniciarPartida() {
    const tamanho = clamp(parseInt(dom.inputTamanho.value, 10) || 8, 5, 12);
    const nivel = dom.selectNivel.value in LEVELS ? dom.selectNivel.value : "medio";
    const municaoInformada = parseInt(dom.inputMunicao.value, 10);

    if (Number.isNaN(municaoInformada) || municaoInformada < 1) {
        alert("Informe uma munição válida (mínimo 1).");
        dom.inputMunicao.focus();
        return;
    }

    const municao = clamp(municaoInformada, 1, 99);
    const resultadoMontagem = montarFrota(tamanho, nivel);

    if (!resultadoMontagem) {
        alert("Não foi possível posicionar a frota. Tente outro tamanho de tabuleiro.");
        return;
    }

    state.tamanho = tamanho;
    state.nivel = nivel;
    state.municao = municao;
    state.acertos = 0;
    state.erros = 0;
    state.finalizado = false;
    state.bloqueadoPorVideo = false;
    state.ativo = true;
    state.board = resultadoMontagem.board;
    state.ships = resultadoMontagem.ships;
    state.naviosRestantes = state.ships.length;
    state.celulasDeNavioRestantes = state.ships.reduce(
        (total, ship) => total + ship.comprimento,
        0
    );

    dom.setupPanel.classList.add("hidden");
    dom.gamePanel.classList.remove("hidden");
    dom.menuReiniciar.classList.remove("hidden");

    renderizarTabuleiro();
    atualizarHud();
    setStatus(`Partida iniciada no nível ${LEVELS[nivel].nome}. Boa caçada.`, "info");

    fecharVideo();
    emitirEstado("game");
}

function voltarAoMenu() {
    state.ativo = false;
    state.bloqueadoPorVideo = false;
    dom.gamePanel.classList.add("hidden");
    dom.setupPanel.classList.remove("hidden");
    dom.menuReiniciar.classList.add("hidden");
    setStatus("Inicie a partida para começar o combate.", "info");
    fecharVideo();
    emitirEstado("menu");
}

function reiniciarRodada() {
    if (!state.tamanho) {
        voltarAoMenu();
        return;
    }

    iniciarPartida();
}

function configurarEventos() {
    dom.btnIniciar.addEventListener("click", iniciarPartida);
    dom.btnNovoJogo.addEventListener("click", iniciarPartida);
    dom.btnVoltarMenu.addEventListener("click", voltarAoMenu);
    dom.menuReiniciar.addEventListener("click", reiniciarRodada);

    dom.inputMunicao.addEventListener("input", () => {
        municaoEditadaManualmente = true;
    });

    dom.selectNivel.addEventListener("change", sugerirMunicao);
    dom.inputTamanho.addEventListener("input", sugerirMunicao);
    window.addEventListener("resize", calcularTamanhoCelula);

    // Compatibilidade com integrações antigas.
    window.iniciarJogo = iniciarPartida;
}

(function bootstrap() {
    configurarEventos();
    sugerirMunicao();
    atualizarHud();
    setStatus("Inicie a partida para começar o combate.", "info");
    emitirEstado("menu");
})();
