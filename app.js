// Globals and State
let ytPlayer;
let isPlayerReady = false;
let currentVideoId = null;
let playlist = [];
let currentIndex = -1;
let progressInterval;
let isDraggingProgress = false;

// DOM Elements
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const welcomeState = document.getElementById('welcomeState');
const loadingState = document.getElementById('loadingState');
const resultsSection = document.getElementById('resultsSection');
const resultsGrid = document.getElementById('resultsGrid');

// Modal Elements
const settingsBtn = document.getElementById('settingsBtn');
const apiModal = document.getElementById('apiModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiBtn = document.getElementById('saveApiBtn');
const toggleVisibilityBtn = document.getElementById('toggleVisibilityBtn');

// Player Elements
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const muteBtn = document.getElementById('muteBtn');
const volumeSlider = document.getElementById('volumeSlider');
const progressBarWrapper = document.getElementById('progressBarWrapper');
const progressBarFill = document.getElementById('progressBarFill');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');

// Track Info Elements
const currentThumb = document.getElementById('currentThumb');
const thumbPlaceholder = document.getElementById('thumbPlaceholder');
const currentTitle = document.getElementById('currentTitle');
const currentChannel = document.getElementById('currentChannel');

// 1. YouTube IFrame API Initialization
// Esta função é chamada automaticamente pelo script da API do YouTube
function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('youtube-player', {
        height: '100', 
        width: '100',
        videoId: '', 
        playerVars: {
            'autoplay': 0,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'rel': 0,
            'modestbranding': 1,
            'origin': window.location.protocol === 'file:' ? 'http://localhost' : window.location.origin
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    isPlayerReady = true;
    volumeSlider.value = ytPlayer.getVolume();
    updateVolumeIcon(ytPlayer.getVolume());
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        startProgressInterval();
        updatePlayPauseBtn(true);
        updateTrackDuration();
    } else {
        stopProgressInterval();
        updatePlayPauseBtn(false);
    }

    if (event.data === YT.PlayerState.ENDED) {
        playNext();
    }
}

function onPlayerError(event) {
    console.error("YouTube Player Error:", event.data);
    alert("Ocorreu um erro ao reproduzir esta música. Erro código: " + event.data);
    playNext(); // Tenta pular para a próxima
}

// 2. Playback Controls
function playVideo(videoObj) {
    if (!isPlayerReady) {
        alert("O player ainda está carregando. Tente novamente em alguns segundos.");
        return;
    }
    
    currentVideoId = videoObj.id.videoId || videoObj.id;
    
    // Atualiza Visual do Player
    currentThumb.src = videoObj.snippet.thumbnails.high.url;
    currentThumb.classList.remove('hidden');
    thumbPlaceholder.classList.add('hidden');
    currentTitle.textContent = decodeHTML(videoObj.snippet.title);
    currentChannel.textContent = decodeHTML(videoObj.snippet.channelTitle);

    // Remove disabled dos botões
    playPauseBtn.removeAttribute('disabled');
    
    // Inicia Som
    ytPlayer.loadVideoById(currentVideoId);
    ytPlayer.playVideo();
}

playPauseBtn.addEventListener('click', () => {
    if (!isPlayerReady || !currentVideoId) return;
    
    const state = ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
    } else {
        ytPlayer.playVideo();
    }
});

function updatePlayPauseBtn(isPlaying) {
    playPauseBtn.innerHTML = isPlaying 
        ? '<i class="fa-solid fa-pause"></i>' 
        : '<i class="fa-solid fa-play"></i>';
}

function playNext() {
    if (playlist.length === 0 || currentIndex === -1) return;
    currentIndex = (currentIndex + 1) % playlist.length;
    playVideo(playlist[currentIndex]);
}

function playPrev() {
    if (playlist.length === 0 || currentIndex === -1) return;
    
    const currentT = ytPlayer.getCurrentTime();
    // Se tocou mais de 3 segundos, volta para o início da música. Senão vai pra anterior.
    if (currentT > 3) {
        ytPlayer.seekTo(0);
    } else {
        currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        playVideo(playlist[currentIndex]);
    }
}

nextBtn.addEventListener('click', playNext);
prevBtn.addEventListener('click', playPrev);

// 3. Progress and Volume
function updateTrackDuration() {
    const duration = ytPlayer.getDuration();
    totalTimeEl.textContent = formatTime(duration);
}

function startProgressInterval() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (isDraggingProgress) return;
        const current = ytPlayer.getCurrentTime();
        const duration = ytPlayer.getDuration();
        
        if (duration > 0) {
            const percent = (current / duration) * 100;
            progressBarFill.style.width = `${percent}%`;
            currentTimeEl.textContent = formatTime(current);
        }
    }, 500);
}

function stopProgressInterval() {
    clearInterval(progressInterval);
}

progressBarWrapper.addEventListener('click', (e) => {
    if (!isPlayerReady || !currentVideoId) return;
    const rect = progressBarWrapper.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * ytPlayer.getDuration();
    ytPlayer.seekTo(newTime, true);
    progressBarFill.style.width = `${pos * 100}%`;
    currentTimeEl.textContent = formatTime(newTime);
});

volumeSlider.addEventListener('input', (e) => {
    if (!isPlayerReady) return;
    const vol = e.target.value;
    ytPlayer.setVolume(vol);
    if(ytPlayer.isMuted()) ytPlayer.unMute();
    updateVolumeIcon(vol);
});

muteBtn.addEventListener('click', () => {
    if (!isPlayerReady) return;
    if (ytPlayer.isMuted()) {
        ytPlayer.unMute();
        volumeSlider.value = ytPlayer.getVolume();
        updateVolumeIcon(ytPlayer.getVolume());
    } else {
        ytPlayer.mute();
        volumeSlider.value = 0;
        updateVolumeIcon(0);
    }
});

function updateVolumeIcon(vol) {
    if (vol == 0 || ytPlayer.isMuted()) muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    else if (vol < 50) muteBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
    else muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// 4. API Key Management
function getApiKey() {
    return localStorage.getItem('yt_api_key');
}

settingsBtn.addEventListener('click', () => {
    const key = getApiKey();
    if (key) apiKeyInput.value = key;
    apiModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    apiModal.classList.add('hidden');
});

toggleVisibilityBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleVisibilityBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
    } else {
        apiKeyInput.type = 'password';
        toggleVisibilityBtn.innerHTML = '<i class="fa-regular fa-eye"></i>';
    }
});

saveApiBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('yt_api_key', key);
        apiModal.classList.add('hidden');
        
        // Se havia uma busca pendente/falha, tentamos limpar a tela inicial
        if (searchInput.value.trim()) {
            searchForm.dispatchEvent(new Event('submit'));
        } else {
            alert('API Key salva com sucesso! Agora você pode buscar músicas acima.');
        }
    } else {
        alert('Por favor, informe uma chave válida.');
    }
});

// Helper for decoding HTML entities in YT titles
function decodeHTML(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

// 5. Search Functionality
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    const apiKey = getApiKey();
    if (!apiKey) {
        alert("Ops! Precisamos da sua YouTube Data API Key para buscar resultados.\nAbra as configurações (engrenagem no canto superior direito) para informar sua chave.");
        apiModal.classList.remove('hidden');
        return;
    }

    performSearch(query, apiKey);
});

async function performSearch(query, apiKey) {
    welcomeState.classList.add('hidden');
    resultsSection.classList.add('hidden');
    loadingState.classList.remove('hidden');
    resultsGrid.innerHTML = '';

    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=12&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        playlist = data.items;
        renderResults(playlist);
        
        loadingState.classList.add('hidden');
        resultsSection.classList.remove('hidden');

    } catch (error) {
        console.error("Search Error:", error);
        
        // Verifica se é erro de cota ou chave inválida
        if (error.message.includes("API key not valid") || error.message.includes("quota")) {
            alert("Erro na API Key. Pode ser inválida ou atingiu o limite de consultas.");
            apiModal.classList.remove('hidden');
        } else {
            alert("Erro ao buscar: " + error.message);
        }
        
        loadingState.classList.add('hidden');
        welcomeState.classList.remove('hidden');
    }
}

function renderResults(items) {
    if (!items || items.length === 0) {
        resultsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">Nenhum resultado encontrado. Tente buscar algo diferente!</p>';
        return;
    }

    items.forEach((item, index) => {
        const decodedTitle = decodeHTML(item.snippet.title);
        const decodedChannel = decodeHTML(item.snippet.channelTitle);

        const card = document.createElement('div');
        card.className = 'music-card';
        card.dataset.index = index;
        
        card.innerHTML = `
            <img class="card-thumb" src="${item.snippet.thumbnails.medium.url}" alt="Thumbnail">
            <div class="card-play-overlay">
                <div class="card-play-btn"><i class="fa-solid fa-play"></i></div>
            </div>
            <div class="card-title" title="${decodedTitle}">${decodedTitle}</div>
            <div class="card-channel">${decodedChannel}</div>
        `;

        card.addEventListener('click', () => {
            currentIndex = parseInt(card.dataset.index);
            playVideo(playlist[currentIndex]);
        });

        resultsGrid.appendChild(card);
    });
}
