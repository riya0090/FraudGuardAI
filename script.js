document.addEventListener("DOMContentLoaded", function () {
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Form submission
    const emailForm = document.getElementById('email-form');
    
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailSubmit);
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

// Display email analysis results
function displayEmailResults(data) {
    const modal = document.getElementById('result-modal');
    const modalTitle = document.getElementById('modal-title');
    const isPhishing = data.prediction === "Phishing Email";
    
    // Update modal title
    modalTitle.textContent = isPhishing ? 'Phishing Email Detected' : 'Safe Email Analysis';
    
    // Update email results section
    document.getElementById('prediction-text').textContent = data.prediction;
    document.getElementById('prediction-text').className = `result-value ${isPhishing ? 'text-danger' : 'text-safe'}`;
    document.getElementById('confidence-text').textContent = `${(data.confidence * 100).toFixed(2)}%`;
    document.getElementById('links-count').textContent = data.features.num_links;
    document.getElementById('keywords-count').textContent = data.features.sensitive_keywords;
    
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
        body: JSON.stringify({ email_text: url })
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
