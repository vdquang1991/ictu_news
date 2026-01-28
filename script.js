let allNews = [];

function loadCSV() {
    Papa.parse("data.csv", {
        download: true,
        header: true,
        complete: function(results) {
            allNews = results.data;

            // Sort by date descending
            allNews.sort((a,b) => new Date(b.Date) - new Date(a.Date));

            displayNews(allNews);
        }
    });
}

function displayNews(newsList) {
    const container = document.getElementById("news-container");
    container.innerHTML = "";

    newsList.forEach(item => {
        if (!item.Title) return;

        const card = document.createElement("div");
        card.className = "news-card";

        card.innerHTML = `
            <div class="news-type">${item.Type}</div>
            <div class="news-date">${item.Date}</div>
            <h3>${item.Title}</h3>
            <p>${item.Content}</p>
        `;

        container.appendChild(card);
    });
}

function filterType(type) {
    if (type === "All") {
        displayNews(allNews);
    } else {
        const filtered = allNews.filter(item => item.Type === type);
        displayNews(filtered);
    }
}

window.onload = loadCSV;
