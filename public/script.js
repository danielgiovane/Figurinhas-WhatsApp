document.addEventListener('DOMContentLoaded', function () {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const selectButton = document.getElementById('selectButton');
    const removeButton = document.getElementById('removeButton');
    const createButton = document.getElementById('createButton');
    const previewImage = document.getElementById('previewImage');
    const uploadContent = document.querySelector('.upload-content');
    const previewContent = document.querySelector('.preview-content');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const buttonContent = document.querySelector('.button-content');
    const keywordsInput = document.getElementById('keywords');
    const searchQuery = document.getElementById('searchQuery');
    const stickerName = document.getElementById('stickerName');
    const collectionSelect = document.getElementById('collectionSelect');

    // Modal de preview
    const modal = document.getElementById('previewModal');
    const modalImg = document.getElementById('modalImage');
    const span = document.getElementsByClassName('close')[0];

    // Carregar coleções
    async function loadCollections() {
        try {
            const response = await fetch('/collections');
            const collections = await response.json();

            // Acesso correto à propriedade 'name' dos objetos
            collectionSelect.innerHTML = collections
                .map(c => `<option value="${c.name}">${c.name}</option>`)
                .join('');
        } catch (error) {
            console.error('Erro ao carregar coleções:', error);
        }
    }

    // Gerenciamento de abas
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });

    // Upload de arquivo
    selectButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    ['dragover', 'dragleave', 'drop'].forEach(event => {
        dropZone.addEventListener(event, preventDefaults);
    });

    dropZone.addEventListener('dragover', () => {
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', handleDrop);

    // Remover imagem
    removeButton.addEventListener('click', resetUploader);

    // Criar sticker
    createButton.addEventListener('click', async () => {
        if (!fileInput.files[0]) return;

        if (stickerName.value.length < 3) {
            alert('O nome deve ter pelo menos 3 caracteres');
            return;
        }

        const formData = new FormData();
        formData.append('sticker', fileInput.files[0]);
        formData.append('name', stickerName.value);
        formData.append('collection', collectionSelect.value);
        formData.append('keywords', keywordsInput.value);

        try {
            toggleLoading(true);
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            await loadStickers();
            await loadCollections();
            resetUploader();
        } catch (error) {
            alert(error.message);
        } finally {
            toggleLoading(false);
        }
    });

    // Preview de imagem
    window.previewSticker = (url) => {
        modalImg.src = url;
        modal.style.display = 'block';
    }

    span.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Busca
    searchQuery.addEventListener('input', debounce(async (e) => {
        const query = e.target.value;
        const response = await fetch(`/stickers?search=${encodeURIComponent(query)}`);
        const stickers = await response.json();
        updateStickerGrid('searchResults', stickers);
    }, 300));

    // Funções auxiliares
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e) {
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleFile(file);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) handleFile(file);
    }

    function handleFile(file) {
        if (file.size > 2 * 1024 * 1024) {
            alert('O arquivo deve ser menor que 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            uploadContent.classList.add('hidden');
            previewContent.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    function resetUploader() {
        fileInput.value = '';
        previewImage.src = '';
        stickerName.value = '';
        keywordsInput.value = '';
        collectionSelect.value = '';
        uploadContent.classList.remove('hidden');
        previewContent.classList.add('hidden');
    }

    async function loadStickers() {
        try {
            const response = await fetch('/stickers');
            const stickers = await response.json();
            updateStickerGrid('myStickers', stickers);
            updateStickerGrid('searchResults', stickers);
        } catch (error) {
            console.error('Erro ao carregar stickers:', error);
        }
    }


    window.shareOnWhatsApp = async (stickerId) => {
        try {
            const response = await fetch(`/share/${stickerId}`);
            const { url } = await response.json();
            window.location.href = url;
        } catch (error) {
            alert('Erro ao compartilhar: ' + error.message);
        }
    };

    // Atualize a função updateStickerGrid
    function updateStickerGrid(containerId, stickers) {
        const container = document.getElementById(containerId);
        container.innerHTML = stickers.map(sticker => `
            <div class="sticker-item">
                <div class="sticker-image-container">
                    <img src="/uploads/${sticker.filename}" 
                         alt="${sticker.name}" 
                         onclick="previewSticker('/uploads/${sticker.filename}')">
                    <button class="sticker-share-btn" onclick="shareOnWhatsApp('${sticker.id}')">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                        <path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/>
                    </svg>
                    </button>
                </div>
                <div class="sticker-info">
                    <h3>${sticker.name}</h3>
                    <div class="sticker-actions">
                        <button class="btn secondary" 
                                onclick="downloadSticker('${sticker.filename}')">
                            Download
                        </button>
                        <span class="sticker-collection">${sticker.collection || 'Geral'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function toggleLoading(isLoading) {
        buttonContent.classList.toggle('hidden', isLoading);
        loadingSpinner.classList.toggle('hidden', !isLoading);
        createButton.disabled = isLoading;
    }

    function debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), timeout);
        };
    }

    // Inicialização
    loadCollections();
    loadStickers();
});

// Funções globais
window.downloadSticker = function (filename) {
    window.location.href = `/download/${filename}`;
};