mat4 = glMatrix.mat4;
vec3 = glMatrix.vec3;

let ModelLoaded = false;
let Model = 0;

let Translate = [0,0,0];
let Rotation = [0,0,0];
let Offset = [0,0,0];

let Target = [0,100,0];
let Position = [0,100,250];

let BgColor = [1,1,1];
let ShowBones = false;

let LastMousePos = [0,0];
let isDragging = false;

let animationState = {
    currentAnimation: null,
    currentFrame: 0,
    isPlaying: false,
    animationRequestId: null,
    activeModel: null
};

console.log("Initializing...");

document.addEventListener("DOMContentLoaded", function () {

    async function loadShaderFile(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load shader: ${url}`);
        }
        return await response.text();
    }

    function loadShader(gl, type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);

        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Shader compilation error: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    class ShaderProgram
    {
        constructor(gl, vsSource, fsSource)
        {
            this.gl = gl;
            this.vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
            this.fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    
            this.shader = gl.createProgram();
            gl.attachShader(this.shader, this.vertexShader);
            gl.attachShader(this.shader, this.fragmentShader);
            gl.linkProgram(this.shader);
    
            if (!gl.getProgramParameter(this.shader, gl.LINK_STATUS)) {
                console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(this.shader));
                return;
            }
    
            gl.useProgram(this.shader);

            this.uViewMatrix = gl.getUniformLocation(this.shader, 'uViewMatrix');
            this.uProjectionMatrix = gl.getUniformLocation(this.shader, 'uProjectionMatrix');
            this.uModelMatrix = gl.getUniformLocation(this.shader, 'uModelMatrix');
            this.uDiffuseTex = gl.getUniformLocation(this.shader, "uDiffuseTex");
            this.aVertexPosition = gl.getAttribLocation(this.shader, 'aVertexPosition');
            this.aVertexNormal = gl.getAttribLocation(this.shader, 'aVertexNormal');
            this.aVertexUV = gl.getAttribLocation(this.shader, 'aVertexUV');

            this.hasTexture = gl.getUniformLocation(this.shader, 'hasTexture');
            this.special = gl.getUniformLocation(this.shader, 'special');
            this.boneColor = gl.getUniformLocation(this.shader, 'boneColor');

            this.hasSkin = gl.getUniformLocation(this.shader, 'hasSkin');

            
            this.uColor = gl.getUniformLocation(this.shader, 'uColor');
            this.uDiffuse = gl.getUniformLocation(this.shader, 'uDiffuse');
            this.uSpecular = gl.getUniformLocation(this.shader, 'uSpecular');
            this.uAmbient = gl.getUniformLocation(this.shader, 'uAmbient');

            gl.activeTexture(gl.TEXTURE0);
            gl.uniform1i(this.shader.uDiffuseTex, 0);
        }

        Use()
        {
            this.gl.useProgram(this.shader);
        }
    }

    function BindCamera(gl, canvas, shaderProgram) {
        let viewMatrix = mat4.create();
        let projectionMatrix = mat4.create();

        const aspect = canvas.width / canvas.height;
        
        mat4.perspective(projectionMatrix, Math.PI * 55/180, aspect, 0.1, 100000.0);
        
        mat4.lookAt(viewMatrix, Position, [0, 0, 0], [0, 1, 0]);
        
        mat4.translate(viewMatrix, viewMatrix, Translate);
        mat4.rotateX(viewMatrix, viewMatrix, Rotation[0]);
        mat4.rotateY(viewMatrix, viewMatrix, Rotation[1]);
        mat4.rotateZ(viewMatrix, viewMatrix, Rotation[2]);
        mat4.translate(viewMatrix, viewMatrix, Offset);

        gl.uniformMatrix4fv(shaderProgram.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(shaderProgram.uProjectionMatrix, false, projectionMatrix);
    }

    async function main() {
        let vsSource, fsSource;
        try {
            [vsSource, fsSource] = await Promise.all([
                loadShaderFile('../scripts/apps/shaders/vertex.glsl'),
                loadShaderFile('../scripts/apps/shaders/fragment.glsl')
            ]);
        } catch (error) {
            console.error('Error loading shaders:', error);
            alert('Unable to load shader files.');
            return;
        }

        const canvas = document.getElementById('webgl-canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext("experimental-webgl");
        const BGcolorSelect = document.getElementById("BGcolorSelect");
        BGcolorSelect.value = '#ffffff';
        const BoneColorSelect = document.getElementById("BoneColorSelect");
        BoneColorSelect.value = '#ff6b9d';
        const BonesChk = document.getElementById("BonesChk");
        const modelSelect = document.getElementById("modelSelect");
        modelSelect.value = '';
        BonesChk.checked = false;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (!gl) {
            alert("Your browser/device does not support WebGL.");
            return;
        }
        
        function resizeCanvas() {
            const container = document.getElementById('appDiv');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                
                gl.viewport(0, 0, width, height);
                updateProjectionMatrix();
                if (ModelLoaded) drawScene();
            }
        }
        
        function updateProjectionMatrix() {
            const aspect = canvas.width / canvas.height;
            const projectionMatrix = mat4.create();
            mat4.perspective(projectionMatrix, Math.PI / 4, aspect, 0.1, 100000.0);
            
            if (shaderProgram && shaderProgram.uProjectionMatrix) {
                gl.uniformMatrix4fv(shaderProgram.uProjectionMatrix, false, projectionMatrix);
            }
        }
        
        console.log("Compiling shaders...");

        const shaderProgram = new ShaderProgram(gl, vsSource, fsSource);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.FRONT);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.depthFunc(gl.LESS);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1i(shaderProgram.special, 0);
        gl.uniform3f(shaderProgram.boneColor, 1,0.42,0.61);


        const animationSelect = document.getElementById('animationSelect');
        const frameSlider = document.getElementById('frameSlider');
        const playButton = document.getElementById('playButton');
        const frameIndicator = document.getElementById('frameIndicator');
        
        animationSelect.addEventListener('change', function() {
            if (!animationState.activeModel) return;
            
            const animIndex = parseInt(this.value);
            if (animIndex >= 0 && animationState.activeModel.animations[animIndex]) {
                animationState.currentAnimation = animationState.activeModel.animations[animIndex].anim;
                if (animationState.currentAnimation) {
                    frameSlider.max = animationState.currentAnimation.frameCount - 1;
                    frameSlider.value = 0;
                    animationState.currentFrame = 0;
                    updateFrameIndicator();
                }
            } else {
                animationState.currentAnimation = null;
                frameSlider.max = 0;
                frameSlider.value = 0;
                animationState.currentFrame = 0;
                updateFrameIndicator();
            }
            
            if (animationState.isPlaying) {
                animationState.isPlaying = false;
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                if (animationState.animationRequestId) {
                    cancelAnimationFrame(animationState.animationRequestId);
                    animationState.animationRequestId = null;
                }
            }
            drawScene();
        });
        
        frameSlider.addEventListener('input', function() {
            if (animationState.currentAnimation) {
                const currentTime = this.value / 100;
                drawScene(currentTime);
            }
        });
        
        playButton.addEventListener('click', function() {
            if (!animationState.currentAnimation) return;
            
            animationState.isPlaying = !animationState.isPlaying;
            
            this.innerHTML = animationState.isPlaying ? 
                '<i class="fas fa-pause"></i>' : 
                '<i class="fas fa-play"></i>';
            if (animationState.isPlaying) {
                animate(performance.now());
            } else if (animationState.animationRequestId) {
                cancelAnimationFrame(animationState.animationRequestId);
            }
        });

        function updateFrameIndicator() {
            const frameCount = animationState.currentAnimation ? 
                animationState.currentAnimation.frameCount : 0;
            frameIndicator.textContent = `Frame: ${animationState.currentFrame + 1}/${frameCount}`;
        }

        function animate(startTime) {
            if (!animationState.isPlaying) return;
            
            const elapsed = (performance.now() - startTime) / 1000;
            const currentTime = elapsed % animationState.currentAnimation.duration;
            
            frameSlider.value = currentTime * 100;
            updateFrameIndicator();
            drawScene(currentTime);
            
            animationState.animationRequestId = requestAnimationFrame(() => animate(startTime));
        }

        function updateFrameIndicator() {
            const currentTime = frameSlider.value / 100;
            const duration = animationState.currentAnimation ? 
                animationState.currentAnimation.duration : 0;
            frameIndicator.textContent = `Time: ${currentTime.toFixed(2)}/${duration.toFixed(2)}`;
        }

        modelSelect.onchange = function(e) {
            let file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const newModel = ReadFile(e.target.result);
                    if (newModel == undefined) {
                        alert("Error while loading file.");
                        return;
                    }
                    
                    model = newModel;
                    animationState.activeModel = newModel;
                    
                    if (animationState.animationRequestId) {
                        cancelAnimationFrame(animationState.animationRequestId);
                        animationState.animationRequestId = null;
                    }
                    animationState.isPlaying = false;
                    animationState.currentAnimation = null;
                    animationState.currentFrame = 0;
                    
                    let bs = {
                        center: vec3.fromValues(0,0,0),
                        radius: 0,
                    };
                    for (const clamp of model.clamps) {
                        clamp.Bind(gl, shaderProgram);
                        bs = CombineSpheres2(bs, clamp.CalculateBoundingSphere());
                    }
                    for (const texture of model.textures) {
                        texture.Bind(gl);
                    }
                    
                    Offset = [0, -bs.center[1], 0];
                    Position = [0, 0, bs.radius * 2.5];
                    Target = [0, Position[1], 1];
                    Translate = [0,0,0];
                    Rotation = [0,0,0];
                    ModelLoaded = true;
                    
                    const animationPanel = document.getElementById('animation-panel');
                    const animationSelect = document.getElementById('animationSelect');
                    const frameSlider = document.getElementById('frameSlider');
                    const playButton = document.getElementById('playButton');
                    const frameIndicator = document.getElementById('frameIndicator');
                    
                    while (animationSelect.options.length > 1) {
                        animationSelect.remove(1);
                    }
                    
                    frameSlider.value = 0;
                    frameSlider.max = 0;
                    frameIndicator.textContent = 'Frame: 0/0';
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                    playButton.disabled = true;
                    frameSlider.disabled = true;
                    
                    /*if (model.animations && model.animations.length > 0) {
                        animationPanel.style.display = 'block';
                        const duration = model.animations[0].anim.duration;
                        frameSlider.min = 0;
                        frameSlider.max = duration * 100; // Using *100 for better slider precision
                        frameSlider.step = "0.01";
                        frameSlider.value = 0;
                        updateFrameIndicator();
                        
                        for (let i = 0; i < model.animations.length; i++) {
                            const option = document.createElement('option');
                            option.value = i;
                            option.textContent = `Animation ${i + 1}`;
                            animationSelect.appendChild(option);
                        }
                        
                        animationSelect.disabled = false;
                        frameSlider.disabled = false;
                        playButton.disabled = false;
                    } else {
                        animationPanel.style.display = 'none';
                        animationSelect.disabled = true;
                    }*/
                    
                    drawScene();
                };
                
                reader.readAsArrayBuffer(file);
            }
        }

        BindCamera(gl, canvas, shaderProgram);
        
        function handleMouseDown(event) {
            if (!ModelLoaded) return;
            
            if (event.button === 0 || event.button === 2) {
                isDragging = true;
                LastMousePos = [
                    event.offsetX == undefined ? event.layerX : event.offsetX,
                    event.offsetY == undefined ? event.layerY : event.offsetY
                ];
                canvas.style.cursor = event.button === 0 ? 'grabbing' : 'move';
            }
        }

        function handleMouseMove(event) {
            if (!ModelLoaded || !isDragging) return;
            
            let x = event.offsetX == undefined ? event.layerX : event.offsetX;
            let y = event.offsetY == undefined ? event.layerY : event.offsetY;

            let xdelta = x - LastMousePos[0];
            let ydelta = y - LastMousePos[1];

            if (event.buttons === 1) { // Left mouse button
                Rotation[0] += ydelta * 0.01;
                Rotation[1] += xdelta * 0.01;
            } else if (event.buttons === 2) { // Right mouse button
                Translate[0] += xdelta * Position[2] / 1000;
                Translate[1] -= ydelta * Position[2] / 1000;
            }

            LastMousePos = [x, y];
            drawScene();
        }

        function handleMouseUp() {
            isDragging = false;
            canvas.style.cursor = 'default';
        }

        function handleWheel(event) {
            if (!ModelLoaded) return;
            
            event.preventDefault();
            Translate[2] -= event.deltaY * Position[2] / 1000;
            drawScene();
        }

        function handleDoubleClick() {
            if (!ModelLoaded) return;
            
            Rotation = [0, 0, 0];
            Translate = [0, 0, 0];
            
            let bs = {
                        center: vec3.fromValues(0,0,0),
                        radius: 0,
            };
            if (model && model.clamps.length > 0) {
                for (const clamp of model.clamps) {
                    clamp.Bind(gl, shaderProgram);
                    bs = CombineSpheres2(bs, clamp.CalculateBoundingSphere());
                }
                Offset = [0, -bs.center[1], 0];
                Position = [0, 0, bs.radius * 2.5];
            }
            
            drawScene();
        }

        function drawScene() {
            gl.clearColor(BgColor[0], BgColor[1], BgColor[2], 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            BindCamera(gl, canvas, shaderProgram);
            
            if (ModelLoaded) {
                for (const clamp of model.clamps) {
                    clamp.Draw(gl, model.textures);
                }
                
                if (ShowBones) {
                    gl.clear(gl.DEPTH_BUFFER_BIT);
                    
                    gl.uniform1i(shaderProgram.special, 1);
                    
                    const animIndex = parseInt(document.getElementById('animationSelect').value);
                    const currentFrame = parseInt(document.getElementById('frameSlider').value);
                    const animation = animIndex >= 0 ? model.animations[animIndex] : null;
                    
                    for (const clamp of model.clamps) {
                        if (clamp.DrawBones) {
                            clamp.DrawBones(gl, animation, currentFrame);
                        }
                    }
                    
                    gl.uniform1i(shaderProgram.special, 0);
                }
            }
        }

        function changeBgColor(event) {
            console.log(`Changing background color to: ${BGcolorSelect.value}`);
            const r = parseInt(BGcolorSelect.value.slice(1, 3), 16);
            const g = parseInt(BGcolorSelect.value.slice(3, 5), 16);
            const b = parseInt(BGcolorSelect.value.slice(5, 7), 16);
            BgColor = [r / 255, g / 255, b / 255];
            drawScene();
        }

        function changeBoneColor(event) {
            console.log(`Changing bone color to: ${BoneColorSelect.value}`);
            const r = parseInt(BoneColorSelect.value.slice(1, 3), 16);
            const g = parseInt(BoneColorSelect.value.slice(3, 5), 16);
            const b = parseInt(BoneColorSelect.value.slice(5, 7), 16);
            gl.uniform3f(shaderProgram.boneColor, r / 255, g / 255, b / 255);
            drawScene();
        }

        function updateProjectionMatrix() {
            const aspect = canvas.width / canvas.height;
            const projectionMatrix = mat4.create();
            mat4.perspective(projectionMatrix, Math.PI / 3, aspect, 0.01, 100000.0);
            
            if (shaderProgram && shaderProgram.uProjectionMatrix) {
                gl.uniformMatrix4fv(shaderProgram.uProjectionMatrix, false, projectionMatrix);
            }
        }

        function ToggleBones(event) {
            console.log(`Toggling bones`);
            ShowBones = event.currentTarget.checked;
            drawScene();
        }
        
        BGcolorSelect.addEventListener('change', changeBgColor);
        BoneColorSelect.addEventListener('change', changeBoneColor);
        window.addEventListener("resize", resizeCanvas);
        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseup", handleMouseUp);
        canvas.addEventListener("mouseleave", handleMouseUp);
        canvas.addEventListener("wheel", handleWheel);
        canvas.addEventListener("dblclick", handleDoubleClick);
        BonesChk.addEventListener("change", ToggleBones);
        canvas.oncontextmenu = function(e) { e.preventDefault(); e.stopPropagation(); };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        console.log(`Initialization finished`);
    }

    main();
});