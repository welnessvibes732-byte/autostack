import re

target_file = r"C:\Users\DELL\Documents\autostackk\god_mode_carousel.html"

with open(target_file, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the button onclick event
html = html.replace('onclick="window.print()"', 'onclick="downloadPDF()"')

# Replace the old status text
old_status_text = 'Use "Save as PDF" in the print dialog. Set margins to "None".'
html = html.replace(old_status_text, 'Generating High-Res PDF... Please wait.')

# Define the new scripts
scripts = """
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script>
        async function downloadPDF() {
            const btn = document.getElementById('downloadBtn');
            const status = document.getElementById('statusText');
            
            btn.style.display = 'none';
            status.style.display = 'block';
            status.innerText = 'INITIALIZING SYSTEM...';
            
            window.scrollTo(0,0);
            
            const slides = document.querySelectorAll('.slide');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'px', [1080, 1350]);
            
            try {
                for (let i = 0; i < slides.length; i++) {
                    status.innerText = `UPLOADING FRAME... (${i + 1}/${slides.length})`;
                    
                    const canvas = await html2canvas(slides[i], {
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#050505'
                    });
                    
                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    
                    if (i > 0) {
                        pdf.addPage([1080, 1350]);
                    }
                    pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
                    
                    status.innerText = `RENDERING FRAME... (${i + 1}/${slides.length})`;
                }

                pdf.save('Aethera_God_Mode_Carousel.pdf');
                
                status.style.color = '#fff';
                status.innerText = 'SYSTEM: PDF SUCCESSFULLY DOWNLOADED.';
                btn.style.display = 'inline-block';
                btn.innerText = 'DOWNLOAD AGAIN';
            } catch (err) {
                console.error(err);
                status.style.color = 'var(--accent-primary)';
                status.innerText = 'SYSTEM ERROR: ' + err.message;
                btn.style.display = 'inline-block';
                btn.innerText = 'RETRY DOWNLOAD';
            }
        }
    </script>
</body>
</html>"""

# Replace the closing tags with the script
html = re.sub(r'<script>.*?</script>\s*</body>\s*</html>', scripts, html, flags=re.DOTALL)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(html)

print("HTML updated with PDF download functionality!")
