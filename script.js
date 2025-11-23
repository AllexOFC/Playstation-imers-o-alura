let cardContainer = document.querySelector(".card-container");
const mainContent = document.querySelector('.main-content');
let campoBusca = document.getElementById("search-input");
let dados = [];

let dadosFiltrados = [];
let currentIndex = 0;
let isTransitioning = false;
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

let isPointerDown = false,
    startX = 0,
    currentTranslate = 0,
    prevTranslate = 0;

const searchFeedback = document.querySelector('.search-feedback');
/** Busca e filtra os dados dos jogos, depois renderiza os cards e configura o carrossel. */
async function iniciarBusca() {
    if (dados.length === 0) {
        try {
            let resposta = await fetch("data.json");
            dados = await resposta.json();
        } catch (error) {
            console.error("Falha ao buscar dados:", error);
            return;
        }
    }

    const termoBusca = campoBusca.value.toLowerCase();

    if (termoBusca) {
        dadosFiltrados = dados.filter(dado =>
            dado.nome.toLowerCase().includes(termoBusca) ||
            dado.descricao.toLowerCase().includes(termoBusca) ||
            (dado.tags && dado.tags.some(tag => tag.toLowerCase().includes(termoBusca)))
        );

        if (dadosFiltrados.length === 0) {
            searchFeedback.textContent = `Nenhum resultado para "${campoBusca.value}"`;
            searchFeedback.style.opacity = '1';
            
            setTimeout(() => {
                searchFeedback.style.opacity = '0';
                campoBusca.value = '';
                iniciarBusca();
            }, 2500);
        }
    } else {
        dadosFiltrados = dados;
    }

    renderizarCards(dadosFiltrados);
    setupCarousel();
}
/** Renderiza os cards dos jogos no container, incluindo clones para o loop infinito. */
function renderizarCards(dadosParaRenderizar) {
    cardContainer.innerHTML = "";
    for (let dado of dadosParaRenderizar) {
        let article = document.createElement("article");
        article.classList.add("card");

        article.innerHTML = `
        <div class="card-info">
            <img class="card-logo" src="${dado.imagemLogo}" alt="Logo do jogo ${dado.nome}">
            <p class="card-description card-description-full">${dado.descricao}</p>
            <p class="card-description card-description-summary">${dado.descricaoResumida || ''}</p>
            <a class="card-link" href="${dado.link}" target="blank">Saiba mais</a>
        </div>
        <div class="hover-indicator">
            <span>Passe o mouse</span>
        </div>
        <div class="age-rating">
            <img src="${dado.faixaEtaria.imagemFaixa}" alt="Classificação ${dado.faixaEtaria.imagemFaixa.match(/\d+/)} anos">
            <div class="rating-reasons">
                ${dado.faixaEtaria.motivos.map(motivo => `<span>${motivo}</span>`).join('')}
            </div>
        </div>`;

        if (dado.imagem) {
            article.style.backgroundImage = `url('${dado.imagem}')`;
        }

        cardContainer.appendChild(article);

        article.addEventListener('mouseenter', () => {
            if (dado.imagem) {
                mainContent.style.setProperty('--bg-image', `url('${dado.imagem}')`);
            }
        });
    }

    if (dadosParaRenderizar.length > 1) {
        const firstCardClone = cardContainer.firstElementChild.cloneNode(true);
        const lastCardClone = cardContainer.lastElementChild.cloneNode(true);
        firstCardClone.setAttribute('data-clone', 'true');
        lastCardClone.setAttribute('data-clone', 'true');
        cardContainer.appendChild(firstCardClone);
        cardContainer.prepend(lastCardClone);

    } else {
        cardContainer.removeEventListener('transitionend', handleTransitionEnd);
    }
}

/** Configura o carrossel, exibindo/ocultando botões e adicionando listeners de evento. */
function setupCarousel() {
    const isCarouselActive = dadosFiltrados.length > 1;
    prevBtn.style.display = isCarouselActive ? 'flex' : 'none';
    nextBtn.style.display = isCarouselActive ? 'flex' : 'none';

    currentIndex = 0;
    if (isCarouselActive) {
        cardContainer.removeEventListener('transitionend', handleTransitionEnd);
        cardContainer.addEventListener('transitionend', handleTransitionEnd);
    }
    updateCarousel({ withTransition: false });
}

/** Atualiza a posição do carrossel para centralizar o card atual. */
function updateCarousel({ withTransition = true } = {}) {
    const card = cardContainer.querySelector('.card');
    if (!card) {
        cardContainer.style.transform = `translateX(0px)`; // Reseta a posição se não houver cards
        return;
    }

    cardContainer.style.transition = withTransition ? 'transform 0.5s ease-in-out' : 'none';
    
    const cardWidth = card.offsetWidth;
    const containerWidth = cardContainer.offsetWidth;
    const gap = parseFloat(getComputedStyle(cardContainer).gap) || 0;
    const clonesOffset = dadosFiltrados.length > 1 ? 1 : 0;
    
    const offset = (containerWidth / 2) - (cardWidth / 2) - ((currentIndex + clonesOffset) * (cardWidth + gap));
    cardContainer.style.transform = `translateX(${offset}px)`;

    if (!isPointerDown) {
        prevTranslate = offset;
    }
}

iniciarBusca();

campoBusca.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        iniciarBusca();
    }
});

const botaoLimpar = document.querySelector('#btn-clean');

botaoLimpar.addEventListener('click', () => {
    campoBusca.value = '';
    iniciarBusca();
});

nextBtn.addEventListener('click', () => {
    if (isTransitioning || dadosFiltrados.length <= 1) return;
    isTransitioning = true;

    currentIndex++;
    updateCarousel();
});

prevBtn.addEventListener('click', () => {
    if (isTransitioning || dadosFiltrados.length <= 1) return;
    isTransitioning = true;

    currentIndex--;
    updateCarousel();
});

/** Gerencia o efeito de loop infinito do carrossel após o término da transição. */
function handleTransitionEnd() {
    isTransitioning = false;

    const totalCardsNaTela = dadosFiltrados.length;
    if (totalCardsNaTela <= 1) {
        return;
    }

    if (currentIndex === totalCardsNaTela) {
        currentIndex = 0;
        updateCarousel({ withTransition: false });
    } else if (currentIndex === -1) {
        currentIndex = totalCardsNaTela - 1;
        updateCarousel({ withTransition: false });
    }
}

/** Limita a frequência de execução de uma função (usado para o evento de resize). */
function debounce(func, delay = 250) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

window.addEventListener('resize', debounce(() => {
    updateCarousel({ withTransition: false });
}));

cardContainer.addEventListener('touchstart', pointerDown);
cardContainer.addEventListener('touchmove', pointerMove);
cardContainer.addEventListener('touchend', pointerUp);

cardContainer.addEventListener('mousedown', pointerDown);
cardContainer.addEventListener('mousemove', pointerMove);
cardContainer.addEventListener('mouseup', pointerUp);
cardContainer.addEventListener('mouseleave', pointerUp);

cardContainer.addEventListener('dragstart', (e) => e.preventDefault());

/** Inicia o gesto de arrastar (seja por toque ou mouse). */
function pointerDown(event) {
    if (isTransitioning || dadosFiltrados.length <= 1) return;
    isPointerDown = true;
    startX = event.type === 'touchstart' ? event.touches[0].clientX : event.pageX;
    cardContainer.style.transition = 'none';
    cardContainer.style.cursor = 'grabbing';
}

/** Move o carrossel conforme o ponteiro (dedo ou mouse) se move. */
function pointerMove(event) {
    if (isPointerDown) {
        const currentX = event.type === 'touchmove' ? event.touches[0].clientX : event.pageX;
        currentTranslate = prevTranslate + currentX - startX;
        cardContainer.style.transform = `translateX(${currentTranslate}px)`;
    }
}

/** Finaliza o gesto de arrastar e decide se navega para o próximo/anterior card. */
function pointerUp() {
    if (!isPointerDown) return;

    isPointerDown = false;
    cardContainer.style.cursor = 'grab';

    const movedBy = currentTranslate - prevTranslate;

    cardContainer.style.transition = 'transform 0.5s ease-in-out';

    const swipeThreshold = 100;

    if (movedBy < -swipeThreshold) {
        nextBtn.click();
    } else if (movedBy > swipeThreshold) {
        prevBtn.click();
    } else {
        cardContainer.style.transform = `translateX(${prevTranslate}px)`;
    }
}