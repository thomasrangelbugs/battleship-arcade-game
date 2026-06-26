(function () {
    const btnHamburger = document.getElementById("btnHamburger");
    const dropdown = document.getElementById("menuDropdown");
    const menuInstrucao = document.getElementById("menuInstrucao");
    const instrucoes = document.getElementById("instrucoes");
    const fecharInstrucoes = document.getElementById("fecharInstrucoes");
    const videoOverlay = document.getElementById("videoOverlay");
    const btnPularVideo = document.getElementById("btnPularVideo");

    if (!btnHamburger || !dropdown) {
        return;
    }

    const itensDropdown = Array.from(dropdown.querySelectorAll(".dropdown-item"));

    function abrirDropdown() {
        dropdown.classList.remove("hidden");
        btnHamburger.setAttribute("aria-expanded", "true");
    }

    function fecharDropdown() {
        dropdown.classList.add("hidden");
        btnHamburger.setAttribute("aria-expanded", "false");
    }

    function toggleDropdown() {
        if (dropdown.classList.contains("hidden")) {
            abrirDropdown();
            return;
        }
        fecharDropdown();
    }

    function abrirInstrucoes() {
        if (!instrucoes) {
            return;
        }
        instrucoes.classList.remove("hidden");
        fecharDropdown();
    }

    function fecharModalInstrucoes() {
        if (!instrucoes) {
            return;
        }
        instrucoes.classList.add("hidden");
    }

    btnHamburger.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleDropdown();
    });

    document.addEventListener("click", (event) => {
        if (!dropdown.contains(event.target) && event.target !== btnHamburger) {
            fecharDropdown();
        }
    });

    if (menuInstrucao) {
        menuInstrucao.addEventListener("click", abrirInstrucoes);
    }

    if (fecharInstrucoes) {
        fecharInstrucoes.addEventListener("click", fecharModalInstrucoes);
    }

    if (instrucoes) {
        instrucoes.addEventListener("click", (event) => {
            if (event.target === instrucoes) {
                fecharModalInstrucoes();
            }
        });
    }

    if (videoOverlay && btnPularVideo) {
        videoOverlay.addEventListener("click", (event) => {
            if (event.target === videoOverlay) {
                btnPularVideo.click();
            }
        });
    }

    for (const item of itensDropdown) {
        item.addEventListener("click", () => {
            if (item !== menuInstrucao) {
                fecharDropdown();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }

        if (!dropdown.classList.contains("hidden")) {
            fecharDropdown();
        }

        if (instrucoes && !instrucoes.classList.contains("hidden")) {
            fecharModalInstrucoes();
        }

        if (videoOverlay && !videoOverlay.classList.contains("hidden") && btnPularVideo) {
            btnPularVideo.click();
        }
    });
})();
