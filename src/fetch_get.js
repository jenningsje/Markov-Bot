function fetch_arxiv() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
        // Typical action to be performed when the document is ready:
        document.getElementById("demo").innerHTML = xhttp.responseText;
        }
    };
    xhttp.open("GET", "http://export.arxiv.org/api/query?search_query=all:electron", true);
    xhttp.send();
}

// URLs of the APIs you want to fetch data from
const apiUrls = [
    "https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi", //medical papers
    "http://export.arxiv.org/api/query?search_query=all:electron", // physics papers
    "https://api.biorxiv.org",  // biology, biochemistry, medicine, biotech 
    "https://inspirehep.net/api/literature", // physics papers
    "https://share.osf.io/api/v2/rawdata/", // Repository and archive for study designs, research materials, data, manuscripts, etc
    "https://api.codex.jaagrav.in"  // software development
    
];