document.addEventListener('DOMContentLoaded', () => {
    const mediaUploadForm = document.getElementById('media-upload-form');
    const imagesContainer = document.getElementById('images-container');
    const videosContainer = document.getElementById('videos-container');

    // Fetch and display media
    async function fetchMedia() {
        try {
            const response = await fetch('/api/media');
            const mediaList = await response.json();

            // Clear existing containers
            imagesContainer.innerHTML = '';
            videosContainer.innerHTML = '';

            mediaList.forEach(media => {
                const mediaElement = document.createElement('div');
                mediaElement.classList.add('media-item');

                if (media.type === 'image') {
                    mediaElement.innerHTML = `
                        <img src="/uploads/images/${media.filename}" alt="${media.title}">
                        <p>${media.title || 'Untitled Image'}</p>
                        <p>${media.description || ''}</p>
                    `;
                    imagesContainer.appendChild(mediaElement);
                } else if (media.type === 'video') {
                    mediaElement.innerHTML = `
                        <video controls>
                            <source src="/uploads/videos/${media.filename}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                        <p>${media.title || 'Untitled Video'}</p>
                        <p>${media.description || ''}</p>
                    `;
                    videosContainer.appendChild(mediaElement);
                }
            });
        } catch (error) {
            console.error('Error fetching media:', error);
        }
    }

    // Upload media
    mediaUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mediaType = document.getElementById('media-type').value;
        const mediaFile = document.getElementById('media-file').files[0];
        const mediaTitle = document.getElementById('media-title').value;
        const mediaDescription = document.getElementById('media-description').value;

        const formData = new FormData();
        formData.append('media', mediaFile);
        formData.append('type', mediaType);
        formData.append('title', mediaTitle);
        formData.append('description', mediaDescription);

        try {
            const response = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                fetchMedia(); // Refresh media list
                mediaUploadForm.reset(); // Clear form
            }
        } catch (error) {
            console.error('Error uploading media:', error);
        }
    });

    // Initial fetch of media
    fetchMedia();
});