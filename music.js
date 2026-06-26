(function () {
    const btn = document.getElementById("menuToggleMusica");
    if (!btn) {
        return;
    }

    const STORAGE_KEY = "bn_music_enabled_v2";
    const player = new Audio("audios/menu.mp3");
    player.loop = true;
    player.volume = 0.34;
    player.preload = "auto";

    const state = {
        phase: "menu",
        unlocked: false,
        enabled: true,
    };

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        state.enabled = saved !== "false";
    } catch (_error) {
        state.enabled = true;
    }

    function salvarPreferencia() {
        try {
            localStorage.setItem(STORAGE_KEY, String(state.enabled));
        } catch (_error) {
            // Ignora problemas de storage.
        }
    }

    function textoBotao() {
        if (!state.enabled) {
            return "🔈 Música: Desligada";
        }
        return player.paused ? "🔊 Música: Ligar" : "🔇 Música: Mutar";
    }

    function atualizarBotao() {
        btn.textContent = textoBotao();
    }

    function trilhaPorFase(phase) {
        return phase === "game" ? "audios/jogo.mp3" : "audios/menu.mp3";
    }

    function trocarTrilha(src) {
        const alvo = new URL(src, window.location.href).href;
        if (player.src === alvo) {
            return;
        }

        const estavaTocando = !player.paused;
        player.pause();
        player.src = src;

        if (estavaTocando && state.enabled && state.unlocked) {
            player.play().catch(() => {});
        }
    }

    function aplicarFase(phase) {
        state.phase = phase;
        trocarTrilha(trilhaPorFase(phase));

        if (state.enabled && state.unlocked) {
            player.play().catch(() => {});
        } else {
            player.pause();
        }

        atualizarBotao();
    }

    function unlockAudio() {
        if (state.unlocked) {
            return;
        }

        state.unlocked = true;
        if (state.enabled) {
            player.play().catch(() => {});
        }

        atualizarBotao();
        window.removeEventListener("pointerdown", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);
    }

    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    btn.addEventListener("click", () => {
        state.enabled = !state.enabled;

        if (state.enabled && state.unlocked) {
            player.play().catch(() => {});
        } else {
            player.pause();
        }

        salvarPreferencia();
        atualizarBotao();
    });

    document.addEventListener("bn:state", (event) => {
        const phase = event.detail && event.detail.phase ? event.detail.phase : "menu";
        aplicarFase(phase);
    });

    atualizarBotao();
})();
