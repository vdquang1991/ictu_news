let allNews = [];
let currentNewsLink = "";
let modalInstance;
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzrwYTpnwC6pa2acnU0uS1CsVs9Nq5QC289pWZVvcOMYdpUxTjxKZ4r8jOGlhAti__5F5b6Q4HFtJw/pub?gid=0&single=true&output=csv";

function loadCSV() {
    Papa.parse(CSV_URL, {
        download: true,
        header: true,
        complete: function(results) {
            allNews = results.data;
            allNews.sort((a,b)=> new Date(b.Date)-new Date(a.Date));
            displayNews(allNews);
            checkHashOpen();
        }
    });
}

function displayNews(newsList) {
    const container = document.getElementById("news-container");
    container.innerHTML = "";
    const today = new Date();

    newsList.forEach((item,index)=>{
        if(!item.Title) return;

        const newsId = "news-"+index;

        let icon="📢";
        if(item.Type==="NCKH") icon="🔬";
        if(item.Type==="Contest") icon="🏆";

        let shortContent=item.Content;
        if(shortContent.length>20)
            shortContent=shortContent.substring(0,20)+"...";

        const newsDate=new Date(item.Date);
        const diffDays=(today-newsDate)/(1000*60*60*24);
        const isNew = diffDays<=3;

        const div=document.createElement("div");
        div.className="card mb-2 news-item "+(isNew?"news-new":"news-normal");
        div.id=newsId;

        div.innerHTML=`
            <div class="card-body">
                <h6 class="card-title">${icon} ${item.Title}</h6>
                <div class="text-muted small">📅 ${item.Date} | ${item.Type}</div>
                <div class="card-text mt-1">${shortContent}</div>
            </div>
        `;

        div.onclick=function(){
            openModal(item,newsId);
        };

        container.appendChild(div);
    });
}

function filterType(type){
    if(type==="All") displayNews(allNews);
    else displayNews(allNews.filter(n=>n.Type===type));
}

function openModal(item,newsId){
    document.getElementById("modal-title").innerText=item.Title;
    document.getElementById("modal-info").innerText="📅 "+item.Date+" | "+item.Type;
    document.getElementById("modal-content").innerHTML=marked.parse(item.Content);

    const modalEl=document.getElementById("newsModal");
    modalInstance=new bootstrap.Modal(modalEl);
    modalInstance.show();

    window.location.hash=newsId;
    currentNewsLink=window.location.href;
}

function copyNewsLink(){
    navigator.clipboard.writeText(currentNewsLink)
        .then(()=>alert("✅ Link đã copy!"));
}

// mở popup khi truy cập link share
function checkHashOpen(){
    const hash=window.location.hash;
    if(hash){
        const target=document.querySelector(hash);
        if(target) target.click();
    }
}

window.onload=loadCSV;
