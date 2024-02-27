mat4 = glMatrix.mat4;
vec3 = glMatrix.vec3;

let ModelLoaded = false;
let Model = 0;

let Translate = [0,0,0];
let Rotation = [0,0,0];
let Offset = [0,0,0];

let Target = [0,100,0];
let Position = [0,100,250];

let BgColor = [0,0.75,1];
let ShowBones = false;

let LastMousePos = [0,0];

console.log("Initializing...");


document.addEventListener("DOMContentLoaded", function () {
    
    const vsSource = `
        attribute vec3 aVertexPosition;
        attribute vec3 aVertexNormal;
        attribute vec2 aVertexUV;

        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying highp vec3 vNormal;
        varying highp vec2 vUV;

        uniform int hasSkin;
        uniform mat4 boneMatrices[4];
        uniform mat4 inverseBindMatrices[4];

        mat3 transpose(mat3 m) {
            return mat3(
                vec3(m[0][0], m[1][0], m[2][0]),
                vec3(m[0][1], m[1][1], m[2][1]),
                vec3(m[0][2], m[1][2], m[2][2])
            );
        }

        mat3 inverse(mat3 m) {
            vec3 r0 = cross(m[1], m[2]);
            vec3 r1 = cross(m[2], m[0]);
            vec3 r2 = cross(m[0], m[1]);
            float determinant = dot(m[0], r0);
            if (abs(determinant) < 0.0001) {
                return mat3(0.0);
            }
            float invDet = 1.0 / determinant;
            return mat3(
                r0 * invDet,
                r1 * invDet,
                r2 * invDet
            );
        }

        void main(void) {
            //if (hasSkin == 1)
            //    gl_Position = uProjectionMatrix * uViewMatrix * vec4(aVertexPosition,1.0);
            //else
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aVertexPosition,1.0);
            
            gl_PointSize = 5.0;
            mat3 normat = transpose(inverse(mat3(uViewMatrix * uModelMatrix)));
            vNormal = normalize(normat * aVertexNormal);
            vUV = aVertexUV;
        }
    `;

    const fsSource = `
        uniform int special;
        uniform highp vec3 boneColor;
        
        uniform sampler2D uDiffuseTex;
        uniform int hasTexture;
        uniform highp vec3 uColor;
        uniform highp float uDiffuse;
        uniform highp float uSpecular;
        uniform highp float uAmbient;
        
        varying highp vec3 vNormal;
        varying highp vec2 vUV;
        
        void main(void) {
        
            if (special == 1)
            {
                gl_FragColor = vec4(boneColor, 1.0);
                return;
            }
            highp vec4 color = vec4(1.0, 1.0, 1.0, 1.0);

            if (hasTexture != 0)
                color = texture2D(uDiffuseTex, vUV);

            if (color.a < 0.1)
                discard;

            highp float diff = clamp(dot(vNormal, vec3(0,0,1)), 0.0, 0.5) * uDiffuse;
            highp vec3 diffuse = diff * uColor;
            highp vec3 ambient = (1.4-uAmbient) * uColor;

            
            highp vec3 reflectDir = reflect(vec3(0,0,-1), vNormal);
            highp float spec = pow(max(dot(vec3(0,0,-1), reflectDir), 0.0), 32.0);
            highp vec3 specular = uSpecular * spec * uColor;

            gl_FragColor = vec4(((ambient + diffuse + specular) * color.rgb).rgb, color.a);

        }
    `;

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

    function BindCamera(gl, canvas, shaderProgram)
    {
        let viewMatrix = mat4.create();
        let projectionMatrix = mat4.create();

        mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100000.0);
        mat4.lookAt(viewMatrix, Position, [Position[0], Position[1], Position[2]-1], [0, 1, 0]);
        
        mat4.translate(viewMatrix, viewMatrix, Translate);
        mat4.rotateX(viewMatrix, viewMatrix, Rotation[0]);
        mat4.rotateY(viewMatrix, viewMatrix, Rotation[1]);
        mat4.rotateZ(viewMatrix, viewMatrix, Rotation[2]);
        mat4.translate(viewMatrix, viewMatrix, Offset);

        gl.uniformMatrix4fv(shaderProgram.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(shaderProgram.uProjectionMatrix, false, projectionMatrix);
    }

    function main() {
        const canvas = document.getElementById('webgl-canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext("experimental-webgl");
        const BGcolorSelect = document.getElementById("BGcolorSelect");
        const BoneColorSelect = document.getElementById("BoneColorSelect");
        const BonesChk = document.getElementById("BonesChk");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (!gl) {
            alert("Your browser/device does not support WebGL.");
            return;
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
        gl.uniform3f(shaderProgram.boneColor, 1,0,0);


        modelSelect.onchange = function(e) {
            let file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
        
                reader.onload = function(e) {

                    model = ReadFile(e.target.result);
                    if (model == undefined)
                    {
                        alert("Error while loading file.");
                        return;
                    }
                    let bs = {
                        center: vec3.fromValues(0,0,0),
                        radius: 0,
                    };
                    for (const clamp of model.clamps)
                    {
                        clamp.Bind(gl, shaderProgram);
                        bs = CombineSpheres2(bs, clamp.CalculateBoundingSphere());
                    }
                    for (const texture of model.textures)
                    {
                        texture.Bind(gl);
                    }
                    Offset = [0, -bs.center[1] / 1.75 - bs.radius / 2, 0];
                    Position = [0, bs.center[1] * (1 / 3) - bs.radius / 2, bs.radius * 2];
                    Target = [0, Position[1], 1];
                    Translate = [0,0,0]
                    Rotation = [0,0,0]
                    ModelLoaded = true;
                    drawScene();
                };
        
                reader.readAsArrayBuffer(file);
            }
        }

        BindCamera(gl, canvas, shaderProgram);
        
        function handleKeyDown(event)
        {
            if (!ModelLoaded)
                return;
            switch (event.key) {
                case ' ':
                    Rotation = [0,0,0];
                    Translate = [0,0,0];
                    break;
                case 'ArrowUp':
                    Rotation[0] += 0.1;
                    break;
                case 'ArrowDown':
                    Rotation[0] -= 0.1;
                    break;
                case 'ArrowLeft':
                    Rotation[1] -= 0.1;
                    break;
                case 'ArrowRight':
                    Rotation[1] += 0.1;
                    break;
                case 'w':
                    Translate[1] += Position[2] / 100;
                    break;
                case 's':
                    Translate[1] -= Position[2] / 100;
                    break;
                case 'a':
                    Translate[0] -= Position[2] / 100;
                    break;
                case 'd':
                    Translate[0] += Position[2] / 100;
                    break;
                case 'z':
                case '+':
                    Translate[2] += Position[2] / 50;
                    break;
                case 'x':
                case '-':
                    Translate[2] -= Position[2] / 50;
                    break;
            }
            drawScene();
        }

        function handleMouseMove(event)
        {
            if (!ModelLoaded)
                return;
            let x = event.offsetX == undefined ? event.layerX : event.offsetX;
            let y = event.offsetY == undefined ? event.layerY : event.offsetY;

            if (event.buttons > 0)
            {
                xdelta = x - LastMousePos[0];
                ydelta = y - LastMousePos[1];

                if ((event.buttons & 2) == 2)
                {
                    Translate[0] += xdelta * Position[2] / 1000;
                    Translate[1] -= ydelta * Position[2] / 1000;
                }
                else if ((event.buttons & 1) == 1)
                {
                    Rotation[0] += ydelta * 0.02;
                    Rotation[1] += xdelta * 0.02;
                }
                else if ((event.buttons & 4) == 4)
                {
                    Translate[2] += ydelta * Position[2] / 500;
                }
                

                drawScene();
            }
            LastMousePos = [x, y];
        }

        function handleWheel(event)
        {
            if (!ModelLoaded)
                return;
            Translate[2] -= event.deltaY * Position[2] / 1000;
            drawScene();
        }

        function drawScene() {
            gl.clearColor(BgColor[0], BgColor[1], BgColor[2], 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            BindCamera(gl, canvas, shaderProgram);
            if (ModelLoaded)
            {
                for (const clamp of model.clamps)
                {
                    clamp.Draw(gl, model.textures);
                    if (ShowBones)
                    {
                        gl.clear(gl.DEPTH_BUFFER_BIT); //Draw bones above the model
                        clamp.DrawBones(gl, model.animations[0], 0);
                    }
                }
            }

            //requestAnimationFrame(drawScene);
        }

        function changeBgColor(event)
        {
            console.log(`Changing background color to: ${BGcolorSelect.value}`);
            const r = parseInt(BGcolorSelect.value.slice(1, 3), 16);
            const g = parseInt(BGcolorSelect.value.slice(3, 5), 16);
            const b = parseInt(BGcolorSelect.value.slice(5, 7), 16);
            BgColor = [r / 255, g / 255, b / 255];
            drawScene();
        }

        function changeBoneColor(event)
        {
            console.log(`Changing bone color to: ${BoneColorSelect.value}`);
            const r = parseInt(BoneColorSelect.value.slice(1, 3), 16);
            const g = parseInt(BoneColorSelect.value.slice(3, 5), 16);
            const b = parseInt(BoneColorSelect.value.slice(5, 7), 16);
            gl.uniform3f(shaderProgram.boneColor, r / 255, g / 255, b / 255);
            drawScene();
        }

        function resizeCanvas(event)
        {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            drawScene();
        }

        function ToggleBones(event)
        {
            console.log(`Toggling bones`);
            ShowBones = event.currentTarget.checked;
            drawScene();
        }
        
        BGcolorSelect.addEventListener('change', changeBgColor);
        BoneColorSelect.addEventListener('change', changeBoneColor);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener("resize", resizeCanvas);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("wheel", handleWheel);
        BonesChk.addEventListener("change", ToggleBones);
        canvas.oncontextmenu = function(e) { e.preventDefault(); e.stopPropagation(); };
        drawScene();
        console.log(`Initialization finished`);
    }

    main();
});