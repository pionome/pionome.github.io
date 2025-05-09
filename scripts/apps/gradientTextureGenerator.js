document.addEventListener('DOMContentLoaded', function() {
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const horizontalBtn = document.getElementById('horizontalBtn');
    const verticalBtn = document.getElementById('verticalBtn');
    const stripContainer = document.getElementById('stripContainer');
    const addStripBtn = document.getElementById('addStrip');
    const downloadBtn = document.getElementById('downloadBtn');
    const randomizeBtn = document.getElementById('randomizeBtn');
    const resetBtn = document.getElementById('resetBtn');
    const canvas = document.getElementById('texturePreview');
    const ctx = canvas.getContext('2d');
    
    const colorPickerModal = document.getElementById('colorPickerModal');
    const colorPickerInput = document.getElementById('colorPickerInput');
    const colorHexInput = document.getElementById('colorHexInput');
    const colorRgbInput = document.getElementById('colorRgbInput');
    const colorPickerClose = document.getElementById('colorPickerClose');
    const colorPickerCancel = document.getElementById('colorPickerCancel');
    const colorPickerApply = document.getElementById('colorPickerApply');
    
    let stripDirection = 'horizontal';
    let currentColorTarget = null;
    let currentStripIndex = null;
    let currentStopIndex = null;
    let strips = [
        {
            gradient: [
                { color: '#ff6b9d', position: 0 },
                { color: '#d43a7d', position: 1 }
            ]
        },
        {
            gradient: [
                { color: '#5a2d50', position: 0 },
                { color: '#3a1d32', position: 1 }
            ]
        }
    ];
    
    renderStrips();
    updateCanvas();

    widthInput.addEventListener('input', updateCanvas);
    heightInput.addEventListener('input', updateCanvas);
    horizontalBtn.addEventListener('click', () => setDirection('horizontal'));
    verticalBtn.addEventListener('click', () => setDirection('vertical'));
    addStripBtn.addEventListener('click', addStrip);
    downloadBtn.addEventListener('click', downloadTexture);
    randomizeBtn.addEventListener('click', randomizeColors);
    resetBtn.addEventListener('click', resetToDefault);
    
    colorPickerInput.addEventListener('input', updateColorInputs);
    colorHexInput.addEventListener('input', updateColorFromHex);
    colorRgbInput.addEventListener('input', updateColorFromRgb);
    colorPickerClose.addEventListener('click', closeColorPicker);
    colorPickerCancel.addEventListener('click', closeColorPicker);
    colorPickerApply.addEventListener('click', applyColor);
    
    colorPickerModal.addEventListener('click', function(e) {
        if (e.target === colorPickerModal) {
            closeColorPicker();
        }
    });
    
    function setDirection(direction) {
        stripDirection = direction;
        if (direction === 'horizontal') {
            horizontalBtn.classList.add('active');
            verticalBtn.classList.remove('active');
        } else {
            horizontalBtn.classList.remove('active');
            verticalBtn.classList.add('active');
        }
        updateCanvas();
    }
    
    function addStrip() {
        const randomColor1 = getRandomColor();
        const randomColor2 = getRandomColor();
        
        strips.push({
            gradient: [
                { color: randomColor1, position: 0 },
                { color: randomColor2, position: 1 }
            ]
        });
        
        renderStrips();
        updateCanvas();
    }
    
    function removeStrip(index) {
        if (strips.length > 1) {
            strips.splice(index, 1);
            renderStrips();
            updateCanvas();
        } else {
            alert('You need at least 1 gradient strip.');
        }
    }
    
    function addGradientStop(stripIndex) {
        const strip = strips[stripIndex];
        
        if (strip.gradient.length >= 2) {
            const gradientIndex = Math.floor(Math.random() * (strip.gradient.length - 1));
            const position = (strip.gradient[gradientIndex].position + strip.gradient[gradientIndex + 1].position) / 2;
            const color = getIntermediateColor(strip.gradient[gradientIndex].color, strip.gradient[gradientIndex + 1].color, 0.5);
            
            strip.gradient.splice(gradientIndex + 1, 0, {
                color: color,
                position: position
            });
        } else {
            strip.gradient.push({
                color: getRandomColor(),
                position: 0.5
            });
        }
        
        strip.gradient.sort((a, b) => a.position - b.position);
        
        renderStrips();
        updateCanvas();
    }
    
    function removeGradientStop(stripIndex, stopIndex) {
        if (strips[stripIndex].gradient.length > 2) {
            strips[stripIndex].gradient.splice(stopIndex, 1);
            renderStrips();
            updateCanvas();
        } else {
            alert('You need at least 2 color stops in each gradient.');
        }
    }
    
    function updateGradientStop(stripIndex, stopIndex, property, value) {
        strips[stripIndex].gradient[stopIndex][property] = value;
        
        if (property === 'position') {
            strips[stripIndex].gradient.sort((a, b) => a.position - b.position);
            renderStrips();
        }
        
        updateCanvas();
    }
    
    function getRandomColor() {
        return `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    }
    
    function getIntermediateColor(color1, color2, ratio) {
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);
        
        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);
        
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    
    function renderStrips() {
        stripContainer.innerHTML = '';
        
        strips.forEach((strip, stripIndex) => {
            const stripElement = document.createElement('div');
            stripElement.className = 'strip';
            
            const stripHeader = document.createElement('div');
            stripHeader.className = 'strip-header';
            
            const stripTitle = document.createElement('div');
            stripTitle.className = 'strip-title';
            stripTitle.textContent = `Strip ${stripIndex + 1}`;
            
            const removeStripBtn = document.createElement('button');
            removeStripBtn.className = 'remove-strip';
            removeStripBtn.innerHTML = `<i class="fas fa-times"></i> Remove`;
            removeStripBtn.addEventListener('click', () => removeStrip(stripIndex));
            
            stripHeader.appendChild(stripTitle);
            stripHeader.appendChild(removeStripBtn);
            
            const gradientStops = document.createElement('div');
            gradientStops.className = 'gradient-stops';
            
            strip.gradient.forEach((stop, stopIndex) => {
                const stopElement = document.createElement('div');
                stopElement.className = 'gradient-stop';
                
                const colorContainer = document.createElement('div');
                colorContainer.className = 'color-input-container';
                
                const colorPreview = document.createElement('div');
                colorPreview.className = 'color-preview';
                colorPreview.style.backgroundColor = stop.color;
                colorPreview.addEventListener('click', () => {
                    openColorPicker(stripIndex, stopIndex, stop.color);
                });
                
                colorContainer.appendChild(colorPreview);
                
                const positionInput = document.createElement('input');
                positionInput.type = 'range';
                positionInput.min = '0';
                positionInput.max = '1';
                positionInput.step = '0.01';
                positionInput.value = stop.position;
                
                let isDragging = false;
                
                positionInput.addEventListener('mousedown', () => {
                    isDragging = true;
                });
                
                positionInput.addEventListener('mouseup', () => {
                    isDragging = false;
                });
                
                positionInput.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    updateGradientStop(stripIndex, stopIndex, 'position', value);
                    
                    const positionValue = e.target.nextElementSibling;
                    positionValue.textContent = Math.round(value * 100) + '%';
                });
                
                positionInput.addEventListener('change', (e) => {
                    if (!isDragging) {
                        const value = parseFloat(e.target.value);
                        updateGradientStop(stripIndex, stopIndex, 'position', value);
                    }
                });
                
                const positionValue = document.createElement('span');
                positionValue.className = 'position-value';
                positionValue.textContent = Math.round(stop.position * 100) + '%';
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-stop';
                removeBtn.innerHTML = `<i class="fas fa-times"></i>`;
                removeBtn.addEventListener('click', () => removeGradientStop(stripIndex, stopIndex));
                
                stopElement.appendChild(colorContainer);
                stopElement.appendChild(positionInput);
                stopElement.appendChild(positionValue);
                stopElement.appendChild(removeBtn);
                
                gradientStops.appendChild(stopElement);
            });
            
            const addStopBtn = document.createElement('button');
            addStopBtn.className = 'add-stop';
            addStopBtn.innerHTML = `<i class="fas fa-plus"></i> Add Color Stop`;
            addStopBtn.addEventListener('click', () => addGradientStop(stripIndex));
            
            stripElement.appendChild(stripHeader);
            stripElement.appendChild(gradientStops);
            stripElement.appendChild(addStopBtn);
            
            stripContainer.appendChild(stripElement);
        });
    }
    
    function updateCanvas() {
        const width = parseInt(widthInput.value);
        const height = parseInt(heightInput.value);
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (stripDirection === 'horizontal') {
            drawHorizontalStrips(width, height);
        } else {
            drawVerticalStrips(width, height);
        }
    }
    
    function drawHorizontalStrips(width, height) {
        let currentY = 0;
        const stripHeight = height / strips.length;
        
        for (const strip of strips) {
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            
            strip.gradient.forEach(stop => {
                gradient.addColorStop(stop.position, stop.color);
            });
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, currentY, width, stripHeight);
            
            currentY += stripHeight;
        }
    }
    
    function drawVerticalStrips(width, height) {
        let currentX = 0;
        const stripWidth = width / strips.length;
        
        for (const strip of strips) {
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            
            strip.gradient.forEach(stop => {
                gradient.addColorStop(stop.position, stop.color);
            });
            
            ctx.fillStyle = gradient;
            ctx.fillRect(currentX, 0, stripWidth, height);
            
            currentX += stripWidth;
        }
    }
    
    function downloadTexture() {
        const link = document.createElement('a');
        link.download = `gradient-texture-${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
    
    function randomizeColors() {
        strips.forEach(strip => {
            strip.gradient.forEach(stop => {
                stop.color = getRandomColor();
            });
        });
        renderStrips();
        updateCanvas();
    }
    
    function resetToDefault() {
        strips = [
            {
                gradient: [
                    { color: '#ff6b9d', position: 0 },
                    { color: '#d43a7d', position: 1 }
                ]
            },
            {
                gradient: [
                    { color: '#5a2d50', position: 0 },
                    { color: '#3a1d32', position: 1 }
                ]
            }
        ];
        stripDirection = 'horizontal';
        horizontalBtn.classList.add('active');
        verticalBtn.classList.remove('active');
        widthInput.value = 512;
        heightInput.value = 512;
        renderStrips();
        updateCanvas();
    }
    
    function openColorPicker(stripIndex, stopIndex, currentColor) {
        currentStripIndex = stripIndex;
        currentStopIndex = stopIndex;
        currentColorTarget = currentColor;
        
        colorPickerInput.value = currentColor;
        colorHexInput.value = currentColor;
        
        const rgb = hexToRgb(currentColor);
        if (rgb) {
            colorRgbInput.value = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        } else {
            colorRgbInput.value = '';
        }
        
        colorPickerModal.style.display = 'flex';
    }
    
    function closeColorPicker() {
        colorPickerModal.style.display = 'none';
        currentColorTarget = null;
        currentStripIndex = null;
        currentStopIndex = null;
    }
    
    function applyColor() {
        if (currentStripIndex !== null && currentStopIndex !== null) {
            const color = colorPickerInput.value;
            updateGradientStop(currentStripIndex, currentStopIndex, 'color', color);
            renderStrips();
            updateCanvas();
        }
        closeColorPicker();
    }
    
    function updateColorInputs() {
        const color = colorPickerInput.value;
        colorHexInput.value = color;
        
        const rgb = hexToRgb(color);
        if (rgb) {
            colorRgbInput.value = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        }
    }
    
    function updateColorFromHex() {
        let hex = colorHexInput.value;
        
        if (hex && !hex.startsWith('#')) {
            hex = '#' + hex;
        }
        
        if (/^#[0-9A-F]{6}$/i.test(hex)) {
            colorPickerInput.value = hex;
            
            const rgb = hexToRgb(hex);
            if (rgb) {
                colorRgbInput.value = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
            }
        }
    }
    
    function updateColorFromRgb() {
        const rgbStr = colorRgbInput.value;
        const rgbMatch = rgbStr.match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/);
        
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            
            if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
                const hex = rgbToHex(r, g, b);
                colorPickerInput.value = hex;
                colorHexInput.value = hex;
            }
        }
    }
    
    function hexToRgb(hex) {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });
        
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
});