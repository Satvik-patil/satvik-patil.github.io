const essays = [
    { title: "My First Essay", content: "This is the content of my first essay...", date: "2023-05-01" },
    { title: "Another Essay", content: "Here's another essay I've written...", date: "2023-05-15" },
    // Add more essays here
];

function showAboutMe() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div id="about-me">
            <h2>About Me</h2>
            <img src="your-image.jpg" alt="Your Name">
            <p>Hello! I'm [Your Name]. This is a brief introduction about myself...</p>
            <p>I'm passionate about [your interests/field], and I use this space to share my thoughts and ideas.</p>
            <p>Feel free to explore my essays and connect with me on social media!</p>
        </div>
    `;
    setActiveNavItem('About Me');
}

function showEssays() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h2>My Essays</h2>
        <ul id="essay-list"></ul>
        <div id="essay-content"></div>
    `;
    displayEssayList();
    displayEssay(0);
    setActiveNavItem('Essays');
}

function displayEssayList() {
    const essayList = document.getElementById('essay-list');
    essays.forEach((essay, index) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = `${essay.title} (${formatDate(essay.date)})`;
        a.onclick = (e) => {
            e.preventDefault();
            displayEssay(index);
        };
        li.appendChild(a);
        essayList.appendChild(li);
    });
}

function displayEssay(index) {
    const essayContent = document.getElementById('essay-content');
    const essay = essays[index];
    essayContent.innerHTML = `
        <h3>${essay.title}</h3>
        <p><em>Published on ${formatDate(essay.date)}</em></p>
        <p>${essay.content}</p>
    `;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function setActiveNavItem(itemText) {
    const navItems = document.querySelectorAll('nav ul li a');
    navItems.forEach(item => {
        if (item.textContent === itemText) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

window.onload = () => {
    showAboutMe(); // Show the About Me page by default
};