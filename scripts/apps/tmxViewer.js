const TmxPixelFormat = {
    PSMTC32: 0x00,
    PSMTC24: 0x01,
    PSMTC16: 0x02,
    PSMTC16S: 0x0A,
    PSMT8: 0x13,
    PSMT4: 0x14,
    PSMT8H: 0x1B,
    PSMT4HL: 0x24,
    PSMT4HH: 0x2C
};

const TmxWrapMode = {
    URepeatVRepeat: 0x0,
    UClampVRepeat: 0x1,
    URepeatVClamp: 0x4,
    UClampVClamp: 0x5,
    Off: 0xFF
};

let canvas = document.getElementById('textureCanvas');
let ctx = canvas.getContext('2d');
let textureImage = null;
let scale = 1.0;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastX = 0;
let lastY = 0;
let bgColor = '#f5f9ff';
let currentFilename = 'texture';
let filteringEnabled = true;

function initCanvas() {
    const container = document.getElementById('appDiv');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    drawTexture();
}

function drawTexture() {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (textureImage) {
        const centerX = canvas.width / 2 + offsetX;
        const centerY = canvas.height / 2 + offsetY;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        
        ctx.imageSmoothingEnabled = filteringEnabled;
        ctx.mozImageSmoothingEnabled = filteringEnabled;
        ctx.webkitImageSmoothingEnabled = filteringEnabled;
        ctx.msImageSmoothingEnabled = filteringEnabled;
        
        ctx.drawImage(textureImage, -textureImage.width / 2, -textureImage.height / 2);
        ctx.restore();
    }
    
    document.getElementById('zoomInfo').textContent = `Zoom: ${Math.round(scale * 100)}%`;
}

function setupCanvasControls() {
    canvas.addEventListener('mousedown', (e) => {
        if (!textureImage) return;
        if (e.button === 0) { // Left mouse button
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging && textureImage) {
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            offsetX += dx;
            offsetY += dy;
            lastX = e.clientX;
            lastY = e.clientY;
            drawTexture();
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'default';
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        canvas.style.cursor = 'default';
    });

    canvas.addEventListener('wheel', (e) => {
        if (!textureImage) return;
        
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const textureX = (mouseX - canvas.width / 2 - offsetX) / scale;
        const textureY = (mouseY - canvas.height / 2 - offsetY) / scale;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        scale *= zoomFactor;
        scale = Math.max(0.1, Math.min(scale, 10));
        
        offsetX = mouseX - canvas.width / 2 - textureX * scale;
        offsetY = mouseY - canvas.height / 2 - textureY * scale;
        
        drawTexture();
    });

    canvas.addEventListener('dblclick', () => {
        if (textureImage) {
            scale = 1.0;
            offsetX = 0;
            offsetY = 0;
            drawTexture();
        }
    });
    
    let filteringChk = document.getElementById('filteringChk');
    filteringChk.checked = true;
    filteringChk.addEventListener('change', function() {
        filteringEnabled = this.checked;
        drawTexture();
    });

    canvas.style.cursor = 'default';
}

function halfByteToFull(input) {
    return Math.min(input / 128.0 * 255, 255);
}

async function parseTMX(file) {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    const reader = new DecentReader(dataView);
    
    const header = {
        Flag: reader.ReadShort(),
        UserId: reader.ReadShort(),
        FileSize: reader.ReadInt(),
        TAG: reader.ReadInt(),
        Reserved: reader.ReadInt()
    };
    
    if (header.TAG !== 0x30584D54) {
        throw new Error("Invalid TMX file");
    }
    
    const pictureHeader = {
        PaletteCount: reader.ReadByte(),
        PaletteFormat: reader.ReadByte(),
        Width: reader.ReadUShort(),
        Height: reader.ReadUShort(),
        PixelFormat: reader.ReadByte(),
        MipmapCount: reader.ReadByte(),
        MipK: reader.ReadByte(),
        MipL: reader.ReadByte(),
        Reserved: reader.ReadByte(),
        WrapMode: reader.ReadByte(),
        UserTextureId: reader.ReadInt(),
        UserClutId: reader.ReadInt(),
        UserComment: reader.ReadString(28)
    };
    
    let palette = null;
    if (pictureHeader.PaletteCount > 0) {
        let paletteSize = 16;
        if (pictureHeader.PixelFormat === TmxPixelFormat.PSMT8 || pictureHeader.PixelFormat === TmxPixelFormat.PSMT8H) {
            paletteSize = 256;
        }
        
        palette = [];
        if (pictureHeader.PaletteFormat === TmxPixelFormat.PSMTC32) {
            for (let i = 0; i < paletteSize; i++) {
                palette.push({
                    R: reader.ReadByte(),
                    G: reader.ReadByte(),
                    B: reader.ReadByte(),
                    A: halfByteToFull(reader.ReadByte())
                });
            }
        } else if (pictureHeader.PaletteFormat === TmxPixelFormat.PSMTC24) {
            for (let i = 0; i < paletteSize; i++) {
                palette.push({
                    R: reader.ReadByte(),
                    G: reader.ReadByte(),
                    B: reader.ReadByte(),
                    A: 255
                });
            }
        } else if (pictureHeader.PaletteFormat === TmxPixelFormat.PSMTC16 || pictureHeader.PaletteFormat === TmxPixelFormat.PSMTC16S) {
            for (let i = 0; i < paletteSize; i++) {
                const pixel = reader.ReadUShort();
                palette.push({
                    R: ((pixel & 0x001F) << 3),
                    G: ((pixel & 0x03E0) >> 2),
                    B: ((pixel & 0x7C00) >> 7),
                    A: (pixel & 0x8000) ? 255 : 0
                });
            }
        }
        if (palette.length === 256) { //Tile palette
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    const index1 = 8 + j + i * 32;
                    const index2 = 16 + j + i * 32;
                    [palette[index1], palette[index2]] = [palette[index2], palette[index1]];
                }
            }
        }
    }
    
    if (pictureHeader.MipmapCount > 0) {
        console.warn("Mipmaps are not supported and may cause issues");
        let mipSize = pictureHeader.Width * pictureHeader.Height;
        for (let i = 1; i <= pictureHeader.MipmapCount; i++) {
            mipSize += (pictureHeader.Width >> i) * (pictureHeader.Height >> i);
        }
        reader.SeekCur(mipSize);
    }
    
    const imageSize = pictureHeader.Width * pictureHeader.Height;
    const imageData = new Uint8ClampedArray(pictureHeader.Width * pictureHeader.Height * 4);
    
    if (pictureHeader.PixelFormat === TmxPixelFormat.PSMTC32) {
        for (let i = 0; i < imageSize; i++) {
            const idx = i * 4;
            imageData[idx] = reader.ReadByte();
            imageData[idx + 1] = reader.ReadByte();
            imageData[idx + 2] = reader.ReadByte();
            imageData[idx + 3] = halfByteToFull(reader.ReadByte());
        }
    } else if (pictureHeader.PixelFormat === TmxPixelFormat.PSMTC24) {
        for (let i = 0; i < imageSize; i++) {
            const idx = i * 4;
            imageData[idx] = reader.ReadByte();
            imageData[idx + 1] = reader.ReadByte();
            imageData[idx + 2] = reader.ReadByte();
            imageData[idx + 3] = 255;
        }
    } else if (pictureHeader.PixelFormat === TmxPixelFormat.PSMTC16 || pictureHeader.PixelFormat === TmxPixelFormat.PSMTC16S) {
        for (let i = 0; i < imageSize; i++) {
            const idx = i * 4;
            const pixel = reader.ReadUShort();
            imageData[idx] = ((pixel & 0x001F) << 3);
            imageData[idx + 1] = ((pixel & 0x03E0) >> 2);
            imageData[idx + 2] = ((pixel & 0x7C00) >> 7);
            imageData[idx + 3] = (pixel & 0x8000) ? 255 : 0;
        }
    } else if (pictureHeader.PixelFormat === TmxPixelFormat.PSMT8 || pictureHeader.PixelFormat === TmxPixelFormat.PSMT8H) {
        if (!palette || palette.length < 256) {
            throw new Error("8-bit texture requires 256-color palette");
        }
        
        for (let i = 0; i < imageSize; i++) {
            const idx = i * 4;
            const paletteIdx = reader.ReadByte();
            const color = palette[paletteIdx];
            imageData[idx] = color.R;
            imageData[idx + 1] = color.G;
            imageData[idx + 2] = color.B;
            imageData[idx + 3] = color.A;
        }
    } else if (pictureHeader.PixelFormat === TmxPixelFormat.PSMT4 || 
              pictureHeader.PixelFormat === TmxPixelFormat.PSMT4HL || 
              pictureHeader.PixelFormat === TmxPixelFormat.PSMT4HH) {
        if (!palette || palette.length < 16) {
            throw new Error("4-bit texture requires 16-color palette");
        }
        
        for (let i = 0; i < imageSize / 2; i++) {
            const byte = reader.ReadByte();
            const idx1 = i * 8;
            const idx2 = i * 8 + 4;
            
            const paletteIdx1 = byte >> 4;
            const color1 = palette[paletteIdx1];
            imageData[idx1] = color1.R;
            imageData[idx1 + 1] = color1.G;
            imageData[idx1 + 2] = color1.B;
            imageData[idx1 + 3] = color1.A;
            
            const paletteIdx2 = byte & 0x0F;
            const color2 = palette[paletteIdx2];
            imageData[idx2] = color2.R;
            imageData[idx2 + 1] = color2.G;
            imageData[idx2 + 2] = color2.B;
            imageData[idx2 + 3] = color2.A;
        }
    } else {
        throw new Error(`Unsupported pixel format: 0x${pictureHeader.PixelFormat.toString(16)}`);
    }
    
    const imageDataObj = new ImageData(imageData, pictureHeader.Width, pictureHeader.Height);
    
    return {
        header,
        pictureHeader,
        palette,
        imageData: imageDataObj
    };
}

async function loadTMX(file) {
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    currentFilename = file.name.replace(/\.tmx$/i, '');
    try {
        const tmxData = await parseTMX(file);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tmxData.pictureHeader.Width;
        tempCanvas.height = tmxData.pictureHeader.Height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(tmxData.imageData, 0, 0);
        
        textureImage = new Image();
        textureImage.onload = function() {
            scale = 1.0;
            offsetX = 0;
            offsetY = 0;
            
            document.getElementById('textureInfo').innerHTML = `
                <p><strong>Texture Info:</strong></p>
                <p>Size: ${tmxData.pictureHeader.Width}×${tmxData.pictureHeader.Height}</p>
                <p>Format: ${getPixelFormatName(tmxData.pictureHeader.PixelFormat)}</p>
                <p>Palette: ${tmxData.palette ? getPixelFormatName(tmxData.pictureHeader.PaletteFormat) : 'None'}</p>
                <p>Wrap Mode: ${getWrapModeName(tmxData.pictureHeader.WrapMode)}</p>
            `;
            
            drawTexture();
        };
        textureImage.src = tempCanvas.toDataURL();
        saveBtn.disabled = false;
    } catch (error) {
        alert(`Error loading TMX file: ${error.message}`);
        console.error(error);
    }
}

function getPixelFormatName(format) {
    const names = {
        0x00: "PSMTC32 (32-bit RGBA)",
        0x01: "PSMTC24 (24-bit RGB)",
        0x02: "PSMTC16 (16-bit RGBA)",
        0x0A: "PSMTC16S (16-bit RGBA)",
        0x13: "PSMT8 (8-bit indexed)",
        0x14: "PSMT4 (4-bit indexed)",
        0x1B: "PSMT8H (8-bit indexed)",
        0x24: "PSMT4HL (4-bit indexed)",
        0x2C: "PSMT4HH (4-bit indexed)"
    };
    return names[format] || `Unknown (0x${format.toString(16)})`;
}

function getWrapModeName(mode) {
    const names = {
        0x00: "Repeat U & V",
        0x01: "Clamp U, Repeat V",
        0x04: "Repeat U, Clamp V",
        0x05: "Clamp U & V",
        0xFF: "Off"
    };
    return names[mode] || `Unknown (0x${mode.toString(16)})`;
}

function saveAsPNG() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = textureImage.width;
    tempCanvas.height = textureImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(textureImage, 0, 0);
    
    const link = document.createElement('a');
    link.download = currentFilename ? `${currentFilename}.png` : 'texture.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}

document.addEventListener("DOMContentLoaded", function() {
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.addEventListener('click', function() {
        if (!this.disabled) {
            saveAsPNG();
        }
    });
    
    const bgColorPicker = document.getElementById('BGcolorSelect');
    bgColorPicker.value = '#ffffff';
    bgColor = bgColorPicker.value;
    document.getElementById('textureSelect').value = '';
    
    
    initCanvas();
    window.addEventListener('resize', initCanvas);
    setupCanvasControls();
    
    document.getElementById('textureSelect').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            loadTMX(file);
        }
    });
    
    document.getElementById('BGcolorSelect').addEventListener('input', (e) => {
        bgColor = e.target.value;
        drawTexture();
    });
});