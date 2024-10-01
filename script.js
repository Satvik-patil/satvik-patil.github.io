const essays = [
    { title: "The Future of AI", excerpt: "Exploring the potential impacts and ethical considerations of artificial intelligence in our rapidly evolving world.", content: "This is the full content of the essay about the future of AI. It goes into more detail about the topics mentioned in the excerpt...", date: "2023-05-01" },
    { title: "The Art of Coding", excerpt: "Delving into the creative aspects of programming and how it intersects with problem-solving and design.", content: "This is the full content of the essay about the art of coding. It explores the creative process of programming and its similarities to other forms of art...", date: "2023-05-15" },
    { title: "Exploring the Cosmos", excerpt: "A journey through recent astronomical discoveries and their implications for our understanding of the universe.", content: "This is the full content of the essay about exploring the cosmos. It discusses recent astronomical discoveries and their significance...", date: "2023-06-01" },
];

function displayEssays() {
    const essayList = document.getElementById('essay-list');
    if (!essayList) return;

    essays.forEach((essay, index) => {
        const li = document.createElement('li');
        li.className = 'essay-item';
        li.innerHTML = `
            <h2 class="essay-title">${essay.title}</h2>
            <p class="essay-excerpt">${essay.excerpt}</p>
            <div class="essay-full-content">${essay.content}</div>
        `;
        li.addEventListener('click', () => toggleEssay(li));
        essayList.appendChild(li);
    });
}

function toggleEssay(item) {
    const fullContent = item.querySelector('.essay-full-content');
    const allFullContents = document.querySelectorAll('.essay-full-content');
    const allEssayItems = document.querySelectorAll('.essay-item');
    
    allFullContents.forEach(content => {
        if (content !== fullContent) content.style.display = 'none';
    });

    allEssayItems.forEach(essayItem => {
        if (essayItem !== item) essayItem.classList.remove('active');
    });

    if (fullContent.style.display === 'none' || fullContent.style.display === '') {
        fullContent.style.display = 'block';
        item.classList.add('active');
    } else {
        fullContent.style.display = 'none';
        item.classList.remove('active');
    }
}

// Add this function
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

// Add event listener to DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    displayEssays();
    
    // Add dark mode toggle button
    const darkModeToggle = document.createElement('button');
    darkModeToggle.textContent = 'Toggle Dark Mode';
    darkModeToggle.onclick = toggleDarkMode;
    document.body.insertBefore(darkModeToggle, document.body.firstChild);
});