document.addEventListener("DOMContentLoaded", function () {
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // Form submissions
    const emailForm = document.getElementById('email-form');
    const websiteForm = document.getElementById('website-form');
    
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailSubmit);
    }
    
    if (websiteForm) {
        websiteForm.addEventListener('submit', handleWebsiteSubmit);
    }

    // Modal functionality
    const modal = document.getElementById('result-modal');
    const closeModal = document.querySelector('.close-modal');
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Handle email form submission
function handleEmailSubmit(event) {
    event.preventDefault();
    
    const emailContent = document.getElementById('email-content').value.trim();
    const resultElement = document.getElementById('result');
    
    if (!emailContent) {
        showResult('⚠ Please enter email content to analyze', 'error');
        return;
    }

    // Show loading state
    resultElement.innerHTML = `
        <div class="loading-text">
            <div class="loading"></div>
            Analyzing email content...
        </div>
    `;
    resultElement.style.display = 'block';

    fetch("/predict/email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email_text: emailContent })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            showResult(`❌ Error: ${data.error}`, 'error');
        } else {
            displayEmailResults(data);
            scanEmailLinks(emailContent); // Scan any links found in the email
        }
    })
    .catch(error => {
        console.error("Error:", error);
        showResult("❌ Error analyzing email. Please try again.", 'error');
    });
}

// Handle website form submission
function handleWebsiteSubmit(event) {
    event.preventDefault();
    
    const websiteUrl = document.getElementById('website-url').value.trim();
    const resultElement = document.getElementById('result');
    
    if (!websiteUrl) {
        showResult('⚠ Please enter a website URL to analyze', 'error');
        return;
    }

    // Validate URL format
    if (!isValidUrl(websiteUrl)) {
        showResult('❌ Please enter a valid URL (e.g., https://example.com)', 'error');
        return;
    }

    // Show loading state
    resultElement.innerHTML = `
        <div class="loading-text">
            <div class="loading"></div>
            Scanning website...
        </div>
    `;
    resultElement.style.display = 'block';

    fetch("/scan/website", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: websiteUrl })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            showResult(`❌ Error: ${data.error}`, 'error');
        } else {
            displayWebsiteResults(data);
        }
    })
    .catch(error => {
        console.error("Error:", error);
        showResult("❌ Error scanning website. Please try again.", 'error');
    });
}

// Display email analysis results
function displayEmailResults(data) {
    const modal = document.getElementById('result-modal');
    const modalTitle = document.getElementById('modal-title');
    const emailResults = document.getElementById('email-results');
    const isPhishing = data.prediction === "Phishing Email";
    
    // Update modal title
    modalTitle.textContent = isPhishing ? 'Phishing Email Detected' : 'Safe Email Analysis';
    
    // Update email results section
    document.getElementById('prediction-text').textContent = data.prediction;
    document.getElementById('prediction-text').className = `result-value ${isPhishing ? 'text-danger' : 'text-safe'}`;
    document.getElementById('confidence-text').textContent = `${(data.confidence * 100).toFixed(2)}%`;
    document.getElementById('links-count').textContent = data.features.num_links;
    document.getElementById('keywords-count').textContent = data.features.sensitive_keywords;
    
    // Show email results and hide website results
    emailResults.style.display = 'block';
    document.getElementById('website-results').style.display = 'none';
    
    // Show modal
    modal.style.display = 'block';
}

// Scan links found in email content
function scanEmailLinks(emailContent) {
    // Simple regex to find URLs in text
    const urlRegex = /https?:\/\/[^\s]+/g;
    const links = emailContent.match(urlRegex) || [];
    
    if (links.length === 0) {
        document.getElementById('detected-links').style.display = 'none';
        return;
    }
    
    const linkContainer = document.getElementById('link-results-container');
    linkContainer.innerHTML = '<div class="loading-text"><div class="loading"></div> Scanning links...</div>';
    document.getElementById('detected-links').style.display = 'block';
    
    // Limit to first 5 links for performance
    const linksToScan = links.slice(0, 5);
    
    // Scan each link
    Promise.all(linksToScan.map(link => scanSingleLink(link)))
        .then(results => {
            linkContainer.innerHTML = '';
            results.forEach(result => {
                const linkItem = document.createElement('div');
                linkItem.className = 'link-item';
                
                let statusClass = 'error';
                let statusText = 'Not Scanned';
                
                if (result.malicious > 0) {
                    statusClass = 'danger';
                    statusText = `${result.malicious} malicious`;
                } else if (result.suspicious > 0) {
                    statusClass = 'warning';
                    statusText = `${result.suspicious} suspicious`;
                } else if (result.error) {
                    statusText = 'Scan failed';
                } else {
                    statusClass = 'safe';
                    statusText = 'Clean';
                }
                
                linkItem.innerHTML = `
                    <span class="link-url">${result.url}</span>
                    <span class="link-status ${statusClass}">${statusText}</span>
                `;
                
                linkContainer.appendChild(linkItem);
            });
        });
}

// Scan a single link
function scanSingleLink(url) {
    return fetch("/scan/email-links", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email_text: url }) // Sending URL as email_text for simplicity
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            return { url, error: data.error };
        }
        // Find this link's results in the response
        const linkResult = data.links.find(link => link.url === url);
        return linkResult || { url, error: 'No results found' };
    })
    .catch(error => {
        console.error(`Error scanning link ${url}:`, error);
        return { url, error: error.message };
    });
}

// Display website analysis results
function displayWebsiteResults(data) {
    const modal = document.getElementById('result-modal');
    const modalTitle = document.getElementById('modal-title');
    const websiteResults = document.getElementById('website-results');
    
    // Determine verdict
    let verdict = 'Safe';
    let verdictClass = 'text-safe';
    
    if (data.malicious > 0) {
        verdict = 'Dangerous';
        verdictClass = 'text-danger';
    } else if (data.suspicious > 0) {
        verdict = 'Suspicious';
        verdictClass = 'text-warning';
    }
    
    // Update modal title
    modalTitle.textContent = `Website Analysis: ${verdict}`;
    
    // Update website results section
    document.getElementById('verdict-text').textContent = verdict;
    document.getElementById('verdict-text').className = `result-value ${verdictClass}`;
    document.getElementById('malicious-count').textContent = data.malicious || 0;
    document.getElementById('suspicious-count').textContent = data.suspicious || 0;
    
    if (data.report_link) {
        const reportLink = document.getElementById('report-link');
        reportLink.href = data.report_link;
        reportLink.textContent = 'View Detailed Report';
    }
    
    // Show website results and hide email results
    websiteResults.style.display = 'block';
    document.getElementById('email-results').style.display = 'none';
    document.getElementById('detected-links').style.display = 'none';
    
    // Show modal
    modal.style.display = 'block';
}

// Helper function to validate URL format
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Helper function to show simple result messages
function showResult(message, type) {
    const resultElement = document.getElementById('result');
    resultElement.innerHTML = `
        <div class="result-card ${type}">
            <p>${message}</p>
        </div>
    `;
    resultElement.style.display = 'block';
}