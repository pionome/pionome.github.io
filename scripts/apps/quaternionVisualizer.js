const container = document.getElementById('appDiv');
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f9ff);
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        const axesHelper = new THREE.AxesHelper(3);
        scene.add(axesHelper);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(3, 4, 5);
        scene.add(directionalLight);
        
        const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
        backLight.position.set(-3, -2, -3);
        scene.add(backLight);

        const geometry = new THREE.BoxGeometry(2, 2, 2);
        
        const materials = [
            new THREE.MeshPhongMaterial({ color: 0xff3333, transparent: true, opacity: 0.7 }), // Right
            new THREE.MeshPhongMaterial({ color: 0xff7700, transparent: true, opacity: 0.7 }),  // Left
            new THREE.MeshPhongMaterial({ color: 0x33cc33, transparent: true, opacity: 0.7 }),  // Top
            new THREE.MeshPhongMaterial({ color: 0x3366ff, transparent: true, opacity: 0.7 }),  // Bottom
            new THREE.MeshPhongMaterial({ color: 0xffff33, transparent: true, opacity: 0.7 }),  // Front
            new THREE.MeshPhongMaterial({ color: 0xaa55ff, transparent: true, opacity: 0.7 })   // Back
        ];
        
        const cube = new THREE.Mesh(geometry, materials);
        scene.add(cube);
        
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        cube.add(wireframe);

        camera.position.set(4, 3, 5);
        camera.lookAt(0, 0, 0);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 3;
        controls.maxDistance = 15;

        const eulerX = document.getElementById('eulerX');
        const eulerY = document.getElementById('eulerY');
        const eulerZ = document.getElementById('eulerZ');
        const eulerXValue = document.getElementById('eulerX-value');
        const eulerYValue = document.getElementById('eulerY-value');
        const eulerZValue = document.getElementById('eulerZ-value');
        const quatW = document.getElementById('quatW');
        const quatX = document.getElementById('quatX');
        const quatY = document.getElementById('quatY');
        const quatZ = document.getElementById('quatZ');
        const applyQuatBtn = document.getElementById('applyQuat');
        const m00 = document.getElementById('m00');
        const m01 = document.getElementById('m01');
        const m02 = document.getElementById('m02');
        const m10 = document.getElementById('m10');
        const m11 = document.getElementById('m11');
        const m12 = document.getElementById('m12');
        const m20 = document.getElementById('m20');
        const m21 = document.getElementById('m21');
        const m22 = document.getElementById('m22');
        const applyMatrixBtn = document.getElementById('applyMatrix');

        eulerX.addEventListener('input', () => {
            eulerXValue.value = eulerX.value;
            updateRotationFromEuler();
        });
        
        eulerY.addEventListener('input', () => {
            eulerYValue.value = eulerY.value;
            updateRotationFromEuler();
        });
        
        eulerZ.addEventListener('input', () => {
            eulerZValue.value = eulerZ.value;
            updateRotationFromEuler();
        });

        eulerXValue.addEventListener('input', () => {
            const num = parseFloat(eulerXValue.value);
            if (!isNaN(num)) eulerX.value = num;
            updateRotationFromEuler();
        });
        
        eulerYValue.addEventListener('input', () => {
            const num = parseFloat(eulerYValue.value);
            if (!isNaN(num)) eulerY.value = num;
            updateRotationFromEuler();
        });
        
        eulerZValue.addEventListener('input', () => {
            const num = parseFloat(eulerZValue.value);
            if (!isNaN(num)) eulerZ.value = num;
            updateRotationFromEuler();
        });

        applyQuatBtn.addEventListener('click', updateRotationFromQuaternion);
        applyMatrixBtn.addEventListener('click', updateRotationFromMatrix);

        window.addEventListener('resize', () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        });

        function updateRotationFromEuler() {
            const xVal = eulerXValue.value;
            const yVal = eulerYValue.value;
            const zVal = eulerZValue.value;
            
            if (xVal === '-' || yVal === '-' || zVal === '-' || 
                xVal === '' || yVal === '' || zVal === '') return;
            
            const x = parseFloat(xVal);
            const y = parseFloat(yVal);
            const z = parseFloat(zVal);
            
            if (isNaN(x) || isNaN(y) || isNaN(z)) return;
            
            const xRad = THREE.MathUtils.degToRad(x);
            const yRad = THREE.MathUtils.degToRad(y);
            const zRad = THREE.MathUtils.degToRad(z);
            
            const euler = new THREE.Euler(xRad, yRad, zRad, 'YXZ');
            const quaternion = new THREE.Quaternion();
            quaternion.setFromEuler(euler);
            
            cube.setRotationFromQuaternion(quaternion);
            updateDisplays();
        }

        function updateRotationFromQuaternion() {
            const w = parseFloat(quatW.value);
            const x = parseFloat(quatX.value);
            const y = parseFloat(quatY.value);
            const z = parseFloat(quatZ.value);
            
            const quaternion = new THREE.Quaternion(x, y, z, w);
            const length = Math.sqrt(w*w + x*x + y*y + z*z);
            
            if (length > 0.0001) {
                quaternion.normalize();
            } else {
                quaternion.set(0, 0, 0, 1);
            }
            
            cube.setRotationFromQuaternion(quaternion);
            updateDisplays();
        }

        function updateRotationFromMatrix() {
            const values = [
                parseFloat(m00.value), parseFloat(m01.value), parseFloat(m02.value),
                parseFloat(m10.value), parseFloat(m11.value), parseFloat(m12.value),
                parseFloat(m20.value), parseFloat(m21.value), parseFloat(m22.value)
            ];
            
            const matrix = new THREE.Matrix4();
            matrix.set(
                values[0], values[1], values[2], 0,
                values[3], values[4], values[5], 0,
                values[6], values[7], values[8], 0,
                0, 0, 0, 1
            );
            
            const quaternion = new THREE.Quaternion();
            quaternion.setFromRotationMatrix(matrix);
            quaternion.normalize();
            
            cube.setRotationFromQuaternion(quaternion);
            updateDisplays();
        }

        function updateDisplays() {
            const quaternion = new THREE.Quaternion();
            cube.getWorldQuaternion(quaternion);
            
            quatW.value = quaternion.w.toFixed(4);
            quatX.value = quaternion.x.toFixed(4);
            quatY.value = quaternion.y.toFixed(4);
            quatZ.value = quaternion.z.toFixed(4);
            
            const euler = new THREE.Euler();
            euler.setFromQuaternion(quaternion, 'YXZ');
            const eulerXVal = THREE.MathUtils.radToDeg(euler.x);
            const eulerYVal = THREE.MathUtils.radToDeg(euler.y);
            const eulerZVal = THREE.MathUtils.radToDeg(euler.z);
            
            eulerX.value = Math.round(eulerXVal);
            eulerY.value = Math.round(eulerYVal);
            eulerZ.value = Math.round(eulerZVal);
            eulerXValue.value = Math.round(eulerXVal);
            eulerYValue.value = Math.round(eulerYVal);
            eulerZValue.value = Math.round(eulerZVal);
            
            const matrix = new THREE.Matrix4();
            matrix.makeRotationFromQuaternion(quaternion);
            const elements = matrix.elements;
            
            m00.value = elements[0].toFixed(4);
            m01.value = elements[4].toFixed(4);
            m02.value = elements[8].toFixed(4);
            m10.value = elements[1].toFixed(4);
            m11.value = elements[5].toFixed(4);
            m12.value = elements[9].toFixed(4);
            m20.value = elements[2].toFixed(4);
            m21.value = elements[6].toFixed(4);
            m22.value = elements[10].toFixed(4);
        }

        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        
        updateRotationFromEuler();
        animate();

        renderer.domElement.addEventListener('dblclick', () => {
            camera.position.set(4, 3, 5);
            camera.lookAt(0, 0, 0);
            controls.target.set(0, 0, 0);
            controls.update();
        });