mat4 = glMatrix.mat4;
vec3 = glMatrix.vec3;
vec4 = glMatrix.vec4;
quat = glMatrix.quat;

const RmdId = {
    //Renderware:
    RwStruct                          : 0x00000001,
    RwString                          : 0x00000002,
    RwExtension                       : 0x00000003,
    RwMaterial                        : 0x00000007,
    RwMaterialList                    : 0x00000008,
    RwAtomicSector                    : 0x00000009,
    RwPlaneSector                     : 0x0000000A,
    RwWorld                           : 0x0000000B,
    RwFrameList                       : 0x0000000E,
    RwGeometry                        : 0x0000000F,
    RwClump                           : 0x00000010,
    RwAtomic                          : 0x00000014,
    RwTextureNative                   : 0x00000015,
    RwGeometryList                    : 0x0000001A,
    RwAnimation                       : 0x0000001B,
    RwTextureDictionary               : 0x00000016,
    RwUVAnimationDictionary           : 0x0000002B,
    RwSkin                            : 0x00000116,
    RwCollisionData                   : 0x0000011D,
    RwHAnimFrameExtension             : 0x0000011E,
    RwUserData                        : 0x0000011F,
    RwMaterialEffects                 : 0x00000120,
    RwMeshList                        : 0x0000050E,
    //Atlus:
    RmdAnimationPlaceholder           : 0xF0F00001,
    RmdAnimationInstance              : 0xF0F00003,
    RmdAnimationTerminator            : 0xF0F00004,
    RmdTransformOverride              : 0xF0F00005,
    RmdNodeLinkList                   : 0xF0F00006,
    RmdVisibilityAnim                 : 0xF0F00080,
    RmdAnimationCount                 : 0xF0F000F0,
    RmdParticle                       : 0xF0F000E0,
    RmdParticleAnimation              : 0xF0F000E1,
}


class RmdHeader
{
    constructor(reader)
    {
        this.offset = reader.Offset;
        this.chunkId = reader.ReadUInt();
        this.chunkSize = reader.ReadUInt();
        this.chunkVersion = reader.ReadUInt();
        this.endOffset = reader.Offset + this.ChunkSize;
        this.chunkName = Object.keys(RmdId).find(key => RmdId[key] === this.chunkId);
    }
    get ChunkId()
    {
        return this.chunkId;
    }
    get ChunkSize()
    {
        return this.chunkSize;
    }
    get ChunkVersion()
    {
        return this.chunkVersion;
    }
    get ChunkName()
    {
        return this.chunkName;
    }
    get Offset()
    {
        return this.offset;
    }
    get EndOffset()
    {
        return this.endOffset;
    }
    Print()
    {
        console.log(`${this.chunkName} : ${this.chunkSize} @ ${this.offset}`);
    }
}

class RmdAnimation
{
    Decompress( ushort )
    {
        let bits = (ushort & 0x8000) << 16;
        if (ushort & 0x7fff != 0)
        {
            bits |= ((ushort & 0x7800) << 12) + 0x38000000;
            bits |= (ushort & 0x7ff) << 12;
        }
        var buffer = new ArrayBuffer(4);
        var view = new DataView(buffer);
        view.setInt32(0, bits, true);

        return view.getFloat32(0, true);
    }
    constructor(reader)
    {
        this.version = reader.ReadUInt();
        this.keyFrameType = reader.ReadUInt();
        this.frameCount = reader.ReadUInt();
        this.flags = reader.ReadUInt();
        this.duration = reader.ReadFloat();
        this.keyFrames = [];

        for (let i = 0; i < this.frameCount; i++)
        {
            let keyframe;
            if (this.keyFrameType == 2)
            {
                keyframe = {
                    offset: i * 24,
                    time: reader.ReadFloat(),
                    rotation: quat.fromValues(
                        this.Decompress(reader.ReadUShort()),this.Decompress(reader.ReadUShort()),
                        this.Decompress(reader.ReadUShort()),this.Decompress(reader.ReadUShort())),
                    translation: vec3.fromValues(
                        this.Decompress(reader.ReadUShort()),
                        this.Decompress(reader.ReadUShort()),
                        this.Decompress(reader.ReadUShort())),
                    previousOffset: reader.ReadUInt(),
                    previousFrame: undefined,
                    boneIndex: undefined,
                };
            }
            else
            {
                keyframe = {
                    offset: i * 36,
                    time: reader.ReadFloat(),
                    rotation: quat.fromValues(
                        reader.ReadFloat(), reader.ReadFloat(),
                        reader.ReadFloat(), reader.ReadFloat()),
                    translation: vec3.fromValues(reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat()),
                    previousOffset: reader.ReadUInt(),
                    previousFrame: undefined,
                    boneIndex: undefined,
                };
            }
            if (keyframe.time == 0)
                keyframe.boneIndex = i;
            else
            {
                for (const frame of this.keyFrames)
                {
                    if (keyframe.previousOffset == frame.offset)
                    {
                        keyframe.previousFrame = frame;
                        keyframe.boneIndex = frame.boneIndex;
                    }
                }
            }
            this.keyFrames.push(keyframe);
        }

        if (this.keyFrameType == 2)
        {
            let Offset = vec3.fromValues(reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat());
            let Scalar = vec3.fromValues(reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat());
            
            for (let i = 0; i < this.frameCount; i++)
            {
                vec3.multiply(this.keyFrames[i].translation, this.keyFrames[i].translation, Scalar);
                vec3.add(this.keyFrames[i].translation, this.keyFrames[i].translation, Offset);
            }
        }
    }

    GetAnimatedBone(time, boneIndex, frames) {
        const boneFrames = this.keyFrames.filter(f => f.boneIndex === boneIndex);
        
        if (boneFrames.length === 0) {
            const localTransform = mat4.clone(frames[boneIndex].transform);
            const parentIndex = frames[boneIndex].parentIndex;
            if (parentIndex >= 0) {
                const parentTransform = this.GetAnimatedBone(time, parentIndex, frames);
                const worldTransform = mat4.create();
                mat4.multiply(worldTransform, parentTransform, localTransform);
                return worldTransform;
            }
            return localTransform;
        }
        
        let prevFrame = boneFrames[0];
        let nextFrame = boneFrames[boneFrames.length - 1];
        
        for (let i = 0; i < boneFrames.length; i++) {
            if (boneFrames[i].time <= time) {
                prevFrame = boneFrames[i];
            }
            if (boneFrames[i].time >= time) {
                nextFrame = boneFrames[i];
                break;
            }
        }
        
        if (prevFrame.time === time || prevFrame === nextFrame) {
            const invRotation = quat.create();
			quat.conjugate(invRotation, prevFrame.rotation);
			const localTransform = mat4.fromRotationTranslation(
				mat4.create(),
				invRotation,
				prevFrame.translation
			);
            
            const parentIndex = frames[boneIndex].parentIndex;
            if (parentIndex >= 0) {
                const parentTransform = this.GetAnimatedBone(time, parentIndex, frames);
                const worldTransform = mat4.create();
                mat4.multiply(worldTransform, parentTransform, localTransform);
                return worldTransform;
            }
            return localTransform;
        }
        
        const t = (time - prevFrame.time) / (nextFrame.time - prevFrame.time);
        
        const interpTranslation = vec3.create();
        vec3.lerp(interpTranslation, prevFrame.translation, nextFrame.translation, t);
        
        const invPrevRot = quat.create();
		const invNextRot = quat.create();
		quat.conjugate(invPrevRot, prevFrame.rotation);
		quat.conjugate(invNextRot, nextFrame.rotation);

		const interpRotation = quat.create();
		quat.slerp(interpRotation, invPrevRot, invNextRot, t);

		const localTransform = mat4.fromRotationTranslation(
			mat4.create(), 
			interpRotation, 
			interpTranslation
		);
        
        const parentIndex = frames[boneIndex].parentIndex;
        if (parentIndex >= 0) {
            const parentTransform = this.GetAnimatedBone(time, parentIndex, frames);
            const worldTransform = mat4.create();
            mat4.multiply(worldTransform, parentTransform, localTransform);
            return worldTransform;
        }
        return localTransform;
    }
}

class RmdAnimationContainer
{
    constructor(reader)
    {
        reader.SeekCur(64);
        while(true)
        {
            let Child = new RmdHeader(reader);
            if (Child.ChunkId == RmdId.RwAnimation)
                this.anim = new RmdAnimation(reader);
            else if (Child.ChunkId == RmdId.RmdAnimationTerminator)
                break;
            else
                reader.SeekCur(Child.chunkSize);
        }
    }
}

class RmdFrame
{
    constructor(reader)
    {
        this.transform = mat4.create();
        mat4.set( this.transform,
            reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat(), 0,
            reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat(), 0,
            reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat(), 0,
            reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat(), 1);
        this.parentIndex = reader.ReadInt();
        this.userFlags = reader.ReadInt();
    }

    worldTransform(frames) {
        let output = mat4.clone(this.transform);
        if (this.parentIndex > -1) {
            const parentTransform = frames[this.parentIndex].worldTransform(frames);
            mat4.multiply(output, parentTransform, output);
        }
        return output;
    }
}

class RmdMaterial
{
    constructor(reader)
    {
        reader.SeekCur(12);
        this.field00 = reader.ReadInt();
        this.color = [reader.ReadByte()/255, reader.ReadByte()/255, reader.ReadByte()/255, reader.ReadByte() /255];
        this.field08 = reader.ReadInt();
        this.hasTexture = reader.ReadInt();
        this.ambient = reader.ReadFloat();
        this.specular = reader.ReadFloat();
        this.diffuse = reader.ReadFloat();

        if (this.hasTexture == 1)
        {
            reader.SeekCur(28);
            let NameChunk = new RmdHeader(reader);
            this.textureName = reader.ReadString(NameChunk.ChunkSize);
            let MaskNameChunk = new RmdHeader(reader);
            reader.SeekCur(MaskNameChunk.ChunkSize);
            let TexExt = new RmdHeader(reader);
            reader.SeekCur(TexExt.ChunkSize);
        }
        let Ext = new RmdHeader(reader);
        reader.SeekCur(Ext.ChunkSize);
    }
    Use(gl, textures, shaderProgram) {
        gl.uniform1i(shaderProgram.hasTexture, this.hasTexture);
        gl.uniform3f(shaderProgram.uColor, this.color[0], this.color[1], this.color[2]);
        gl.uniform1f(shaderProgram.uAmbient, this.ambient);
        gl.uniform1f(shaderProgram.uDiffuse, this.diffuse);
        gl.uniform1f(shaderProgram.uSpecular, this.specular);
        
        if (this.hasTexture == 1) {
            const tex = textures.find(t => t.Name === this.textureName);
            if (tex) {
                gl.activeTexture(gl.TEXTURE0);
                tex.Use(gl);
            }
        }
    }
}

class RmdSkin
{
    constructor(reader, vertexCount)
    {
        this.boneCount = reader.ReadByte();
        this.usedBoneCount = reader.ReadByte();
        this.maxWeightPerVertex = reader.ReadByte();
        reader.SeekCur(1);
        this.usedBoneIndices = reader.ReadBytes(this.usedBoneCount);
        this.indices = [];
        this.weights = [];
        this.skinToBoneMatrices = [];

        for (let i = 0; i < vertexCount; i++)
        {
            let ind = [];
            ind.push(reader.ReadByte());
            ind.push(reader.ReadByte());
            ind.push(reader.ReadByte());
            ind.push(reader.ReadByte());
            this.indices.push(ind);
        }
        for (let i = 0; i < vertexCount; i++)
        {
            this.weights.push(reader.ReadFloat());
            this.weights.push(reader.ReadFloat());
            this.weights.push(reader.ReadFloat());
            this.weights.push(reader.ReadFloat());
        }
        this.weights = new Float32Array(this.weights);
        for (let i = 0; i < this.boneCount; i++)
        {
            let mat = mat4.create();
            mat4.set( mat,
            reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat(),
            reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat(),
            reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat(),
            reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat(), reader.ReadFloat());
            this.skinToBoneMatrices.push(mat);
        }
        this.boneLimit = reader.ReadInt();
        this.meshCount = reader.ReadInt();
        this.rleCount = reader.ReadInt();

        if (this.meshCount > 0)
        {
            reader.SeekCur(this.boneCount);
            reader.SeekCur(2 * this.meshCount);
            reader.SeekCur(2 * this.rleCount);
        }
    }
}

class RmdGeometry
{
    constructor(reader)
    {
        reader.SeekCur(12);
        this.flags = reader.ReadUShort();
        this.uVChannelCount = reader.ReadByte();
        this.nativeFlag = reader.ReadByte();
        this.faceCount = reader.ReadInt();
        this.vertexCount = reader.ReadInt();
        this.morphCount = reader.ReadInt();

        let vertices = [];
        let colors = [];
        let uvs = [];
        let uvs2 = [];
        let normals = [];

        this.hasVertexColors = (this.flags & 0x8) == 0x8;
        this.hasUVs = ((this.flags & 0x4) == 0x4) || ((this.flags & 0x80) == 0x80);
        this.hasVertices = (this.flags & 0x2) == 0x2;
        this.hasNormals = (this.flags & 0x10) == 0x10;

        if (this.hasVertexColors)
        {
            for (let i = 0; i < this.vertexCount; i++)
            {
                let R = reader.ReadByte() / 255;
                let G = reader.ReadByte() / 255;
                let B = reader.ReadByte() / 255;
                let A = reader.ReadByte() / 255;
                colors.push(R);
                colors.push(G);
                colors.push(B);
                colors.push(A);
            }
            this.colors = new Float32Array(colors);
        }

        if (this.hasUVs)
        {
            for (let i = 0; i < this.vertexCount; i++)
            {
                let U = reader.ReadFloat();
                let V = reader.ReadFloat();
                uvs.push(U);
                uvs.push(V);
            }
            this.uvs = new Float32Array(uvs);
            if (this.uVChannelCount > 1)
            {
                for (let i = 0; i < this.vertexCount; i++)
                {
                    let U = reader.ReadFloat();
                    let V = reader.ReadFloat();
                    V *= -1;
                    V += 1;
                    uvs2.push(U);
                    uvs2.push(V);
                }
                this.uvs2 = new Float32Array(uvs);
            }
        }

        this.meshes = [];

        for (let i = 0; i < this.faceCount; i++)
        {
            let v3 = reader.ReadUShort();
            let v2 = reader.ReadUShort();
            let matId = reader.ReadUShort();
            let v1 = reader.ReadUShort();
            if (this.meshes[matId] == undefined)
                this.meshes[matId] = []
            this.meshes[matId].push(v3,v2,v1);
        }
        for (let i = 0; i < this.meshes.length; i++)
        {
            this.meshes[i] = new Uint16Array(this.meshes[i]);
        }

        this.boundingSphere = {
            center: vec3.fromValues(reader.ReadFloat(),reader.ReadFloat(),reader.ReadFloat()),
            radius: reader.ReadFloat(),
            positionFlag: reader.ReadFloat(),
            normalFlag: reader.ReadFloat(),
        };

        if (this.hasVertices)
        {
            for (let i = 0; i < this.vertexCount; i++)
            {
                let X = reader.ReadFloat();
                let Y = reader.ReadFloat();
                let Z = reader.ReadFloat();
                vertices.push(X);
                vertices.push(Y);
                vertices.push(Z);
            }
            this.vertices = new Float32Array(vertices);
        }

        if (this.hasNormals)
        {
            for (let i = 0; i < this.vertexCount; i++)
            {
                let X = reader.ReadFloat();
                let Y = reader.ReadFloat();
                let Z = reader.ReadFloat();
                normals.push(X);
                normals.push(Y);
                normals.push(Z);
            }
            this.normals = new Float32Array(normals);
        }

        this.materials = []
        let Mats = new RmdHeader(reader);
        reader.SeekCur(12);
        let MaterialCount = reader.ReadInt();
        reader.SeekCur(4 * MaterialCount);
        for (let i = 0; i < MaterialCount; i++)
        {
            let mat = new RmdHeader(reader);
            this.materials.push(new RmdMaterial(reader));
        }
        
        let GeomExt = new RmdHeader(reader);
        this.hasSkin = false;

        while (reader.Offset < GeomExt.EndOffset)
        {
            let CurExt = new RmdHeader(reader);
            if (CurExt.ChunkId == RmdId.RwSkin)
            {
                this.skin = new RmdSkin(reader, this.vertexCount);
                this.hasSkin = true;
            }
            else
                reader.SeekCur(CurExt.ChunkSize);
        }
    }
    Bind(gl, shaderProgram) {
        this.shaderProgram = shaderProgram;
        
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

        this.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);

        this.indexBuffers = [];
        for (let i = 0; i < this.meshes.length; i++) {
            const indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.meshes[i], gl.STATIC_DRAW);
            this.indexBuffers.push(indexBuffer);
        }

        if (this.hasSkin) {
            this.boneIndexBuffer = gl.createBuffer();
            this.boneWeightBuffer = gl.createBuffer();
            
            let boneIndices = new Float32Array(this.vertexCount * 4);
            for (let i = 0; i < this.vertexCount; i++) {
                for (let j = 0; j < 4; j++) {
                    boneIndices[i * 4 + j] = this.skin.indices[i][j];
                }
            }
            
            gl.bindBuffer(gl.ARRAY_BUFFER, this.boneIndexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, boneIndices, gl.STATIC_DRAW);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, this.boneWeightBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.skin.weights, gl.STATIC_DRAW);
        }
    }

    CalculateRigging(gl, curBones, par)
    {
        this.animatedVertices = new Float32Array(this.vertices);

        if (this.hasSkin)
        {
            for (let i = 0; i < this.vertexCount; i++)
            {
                let ind = this.skin.indices[i];

                let weights = [this.skin.weights[i * 4],
                this.skin.weights[i * 4 + 1],
                this.skin.weights[i * 4 + 2],
                this.skin.weights[i * 4 + 3]];

                let vert = vec4.fromValues(this.animatedVertices[i * 3],
                    this.animatedVertices[i * 3 + 1],
                    this.animatedVertices[i * 3 + 2],
                    1);
                
                let tempMatrix = mat4.create();
                let tempVec4 = vec4.create();
                let resultVert = vec4.fromValues(0,0,0,0);

                for (let j = 0; j < 4; j++)
                {
                    if (weights[j] > 0)
                    {
                        mat4.identity(tempMatrix);
                        //mat4.invert(tempMatrix, curBones[ind[j]]);
                        //mat4.multiply(tempMatrix, tempMatrix, curBones[ind[j]]);
                        //mat4.multiply(tempMatrix, tempMatrix, this.skin.skinToBoneMatrices[ind[j]]);
                        //let tmp2 = mat4.create();
                        //mat4.multiply(tempMatrix, this.skin.skinToBoneMatrices[ind[j]], curBones[ind[j]]);
                        //mat4.multiply(tempMatrix, tempMatrix, curBones[ind[j]]);
                        //mat4.multiply(tempMatrix, tempMatrix, curBones[ind[j]]);
                        //mat4.invert(tmp2, this.skin.skinToBoneMatrices[ind[j]]);
                        vec4.transformMat4(tempVec4, vert, tempMatrix);
                        vec4.scale(tempVec4, tempVec4, weights[j]);
                        vec4.add(resultVert, resultVert, tempVec4);
                    }
                }

                this.animatedVertices[i * 3] = resultVert[0];
                this.animatedVertices[i * 3 + 1] = resultVert[1];
                this.animatedVertices[i * 3 + 2] = resultVert[2];
            }

        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.animatedVertices, gl.DYNAMIC_DRAW);
    }

    AnimatedDraw(gl, textures, curBones, par)
    {
        this.CalculateRigging(gl, curBones, par);
        this.Draw(gl, textures);
    }

    Draw(gl, textures) {
		gl.uniform1i(this.shaderProgram.hasSkin, this.hasSkin ? 1 : 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(this.shaderProgram.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shaderProgram.aVertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(this.shaderProgram.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shaderProgram.aVertexNormal);

        if (this.hasUVs) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.vertexAttribPointer(this.shaderProgram.aVertexUV, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.shaderProgram.aVertexUV);
        }

        for (let i = 0; i < this.indexBuffers.length; i++) {
            this.materials[i].Use(gl, textures, this.shaderProgram);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
            gl.drawElements(gl.TRIANGLES, this.meshes[i].length, gl.UNSIGNED_SHORT, 0);
        }

    }
}

function TilePalette(palette) {
    if (palette.length > 16 && palette.length < 256)
    {
        let pal = new Array(256).fill([0, 0, 0, 0]);
        for (let i = 0; i < palette.length; i++)
        {
            pal[i] = palette[i];
        }
        palette = pal;
    }
    else if (palette.length < 16)
    {
        let pal = new Array(16).fill([0, 0, 0, 0]);
        for (let i = 0; i < palette.length; i++)
        {
            pal[i] = palette[i];
        }
        palette = pal;
    }

    let newPalette = new Array(palette.length).fill([0, 0, 0, 0]);
    let newIndex = 0;
    let oldIndex = 0;
    
    for (let i = 0; i < 8; i++)
    {
        for (let x = 0; x < 8; x++)
        {
            newPalette[newIndex++] = palette[oldIndex++];
        }
        oldIndex += 8;
        for (let x = 0; x < 8; x++)
        {
            newPalette[newIndex++] = palette[oldIndex++];
        }
        oldIndex -= 16;
        for (let x = 0; x < 8; x++)
        {
            newPalette[newIndex++] = palette[oldIndex++];
        }
        oldIndex += 8;
        for (let x = 0; x < 8; x++)
        {
            newPalette[newIndex++] = palette[oldIndex++];
        }
    }
    
    return newPalette;
}

class RmdTexture
{
    constructor(reader)
    {
        reader.SeekCur(20);
        
        let NameChunk = new RmdHeader(reader);
        this.Name = reader.ReadString(NameChunk.ChunkSize);
        let MaskNameChunk = new RmdHeader(reader);
        reader.SeekCur(MaskNameChunk.ChunkSize);

        let Raster = new RmdHeader(reader);
        let RasterInfo = new RmdHeader(reader);
        this.Width = reader.ReadInt();
        this.Height = reader.ReadInt();
        this.Depth = reader.ReadInt();
        this.Format = reader.ReadUInt();
        reader.SeekCur(8 * 4);
        this.TexelDataLength = reader.ReadUInt();
        this.PaletteDataLength = reader.ReadUInt();
        this.GpuAlignedLength = reader.ReadUInt();
        this.SkyMipMapValue = reader.ReadUInt();

        let RasterData = new RmdHeader(reader);
        let RasterStart = reader.Offset;
        if ((this.Format & 0x20000) == 0x20000)
            reader.SeekCur(80);

        let pixelData = [];
        this.HasAlpha = true;
        if (this.Depth == 32)
        {
            for (let i = 0; i < this.Width * this.Height; i++)
            {
                pixelData.push(reader.ReadByte());
                pixelData.push(reader.ReadByte());
                pixelData.push(reader.ReadByte());
                pixelData.push(Math.min(reader.ReadByte()/128 * 255, 255));
            }
        }
        else if (this.Depth == 24)
        {
            for (let i = 0; i < this.Width * this.Height * 3; i++)
            {
                pixelData.push(reader.ReadByte());
                this.HasAlpha = false;
            }
        }
        else if (this.Depth == 8)
        {
            for (let i = 0; i < this.Width * this.Height; i++)
            {
                pixelData.push(reader.ReadByte());
            }
        }
        else if (this.Depth == 4)
        {
            for (let i = 0; i < this.Width * this.Height / 2; i++)
            {
                let whole = reader.ReadHalf();
                pixelData.push(whole[1]);
                pixelData.push(whole[0]);
            }
        }
        reader.SeekSet(RasterStart+this.TexelDataLength); 

        RasterStart = reader.Offset;
        if (this.Depth <= 8)
        {
            let unswizzled = new Uint8Array(pixelData.length);
            
            for (let posY = 0; posY < this.Height; posY++) {
                for (let posX = 0; posX < this.Width; posX++) {
                    const blockLocation = (posY & (~0xF)) * this.Width + (posX & (~0xF)) * 2;
                    const swapSelector = (((posY + 2) >> 2) & 0x1) * 4;
                    const positionY = (((posY & (~3)) >> 1) + (posY & 1)) & 0x7;
                    const columnLocation = positionY * this.Width * 2 + ((posX + swapSelector) & 0x7) * 4;
                    const byteNumber = ((posY >> 1) & 1) + ((posX >> 2) & 2);
        
                    unswizzled[posY * this.Width + posX] = pixelData[blockLocation + columnLocation + byteNumber];
                }
            }


            if ((this.Format & 0x20000) == 0x20000)
                reader.SeekCur(80);
            
            let paletteData = [];

            for (let i = 0; i < this.PaletteDataLength / 4; i++)
            {
                paletteData.push([reader.ReadByte(),reader.ReadByte(),reader.ReadByte(),Math.min(reader.ReadByte()/128 * 255, 255)]);
            }

            if (this.Depth == 8)
                paletteData = TilePalette(paletteData);

            let calculatedData = [];
            for (let i = 0; i < unswizzled.length; i++)
            {
                let CurPixel = paletteData[unswizzled[i]];
                calculatedData.push(CurPixel[0]);
                calculatedData.push(CurPixel[1]);
                calculatedData.push(CurPixel[2]);
                calculatedData.push(CurPixel[3]);
            }
            this.PixelData = new Uint8Array(calculatedData);
        }
        else
        {
            this.PixelData = new Uint8Array(pixelData);
        }
        reader.SeekSet(RasterStart+this.PaletteDataLength); 

        
        let ext = new RmdHeader(reader);
        reader.SeekCur(ext.chunkSize);
    }
    Bind(gl)
    {
        this.GlTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.GlTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.HasAlpha ? gl.RGBA : gl.RGB, this.Width, this.Height, 0, this.HasAlpha ? gl.RGBA : gl.RGB, gl.UNSIGNED_BYTE, this.PixelData);
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    Use(gl)
    {
        gl.bindTexture(gl.TEXTURE_2D, this.GlTexture);
    }
}

function CombineSpheres(og, nw, mat) {
    let newCenter = vec3.transformMat4(vec3.create(), nw.center, mat4.clone(mat));
    let newScale = mat4.getScaling(vec3.create(), mat4.clone(mat));
    let newRadius = nw.radius * Math.max(newScale[0], newScale[1], newScale[2]);
    
    let difference = vec3.subtract(vec3.create(), og.center, newCenter);
    let distance = vec3.length(difference);

    if (distance <= Math.abs(og.radius - newRadius)) {
        return og.radius > newRadius ? og : nw;
    }

    let leftRadius = Math.max(og.radius - distance, newRadius);
    let rightRadius = Math.max(og.radius + distance, newRadius);

    let lrs = leftRadius / (leftRadius + rightRadius);
    let leftToRight = vec3.add(vec3.create(),
        vec3.scale(vec3.create(), og.center, lrs),
        vec3.scale(vec3.create(), newCenter, 1 - lrs)
    );

    return {
        center: leftToRight,
        radius: (leftRadius + rightRadius) / 2,
    };
}

function CombineSpheres2(og, nw)
{
    return CombineSpheres(og, nw, mat4.create());
}


class RmdClamp
{
   constructor(frames, geometries, atomics) {
        this.frames = frames;
        this.geometries = geometries;
        this.atomics = atomics;
        this.boneVertices = [];
        this.boneIndices = [];
    }

    Bind(gl, shaderProgram) {
        this.shaderProgram = shaderProgram;
        for (const geom of this.geometries) {
            geom.Bind(gl, shaderProgram);
        }
        
        this.boneVertexBuffer = gl.createBuffer();
        this.boneIndexBuffer = gl.createBuffer();
        this.bonePointBuffer = gl.createBuffer();
    }

    GetCurBones(currentTime, animation) {
        let curBones = [];
        for (let i = 0; i < this.frames.length; i++) {
            if (currentTime !== undefined && animation?.anim) {
                curBones.push(animation.anim.GetAnimatedBone(currentTime, i, this.frames));
            } else {
                curBones.push(this.frames[i].worldTransform(this.frames));
            }
        }
        return curBones;
    }
	
    UpdateBoneBuffers(gl, currentTime, animation) {
        this.boneVertices = [];
        this.boneIndices = [];
        let bonePoints = [];

        const bones = this.GetCurBones(currentTime, animation);
        
        for (const bone of bones) {
            const pos = mat4.getTranslation(vec3.create(), bone);
            bonePoints.push(pos[0], pos[1], pos[2]);
        }

        for (let i = 0; i < this.frames.length; i++) {
            const parentIndex = this.frames[i].parentIndex;
            if (parentIndex >= 0) {
                this.boneIndices.push(parentIndex, i);
            }
        }
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bonePointBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bonePoints), gl.DYNAMIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.boneVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bonePoints), gl.DYNAMIC_DRAW);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.boneIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.boneIndices), gl.DYNAMIC_DRAW);
    }
	
    Draw(gl, textures) {
        let curBones = this.GetCurBones();
        for (const atomic of this.atomics) {
            gl.uniformMatrix4fv(this.shaderProgram.uModelMatrix, false, 
                this.frames[atomic.frameIndex].worldTransform(this.frames));
            this.geometries[atomic.geometryIndex].Draw(gl, textures);
        }
    }

    DrawBones(gl, animation, curFrame) {
        if (!this.frames || this.frames.length === 0) return;
        
        this.UpdateBoneBuffers(gl, curFrame, animation);
        
        gl.disable(gl.DEPTH_TEST);
        
        const rootBoneIndex = this.frames.findIndex(f => f.parentIndex === -1);
        let rootTransform = mat4.create();
        if (rootBoneIndex >= 0) {
            rootTransform = this.frames[rootBoneIndex].worldTransform(this.frames);
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bonePointBuffer);
        gl.vertexAttribPointer(this.shaderProgram.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shaderProgram.aVertexPosition);
        
        const inverseRoot = mat4.create();
        mat4.invert(inverseRoot, rootTransform);
        gl.uniformMatrix4fv(this.shaderProgram.uModelMatrix, false, inverseRoot);
        
        gl.uniform1i(this.shaderProgram.special, 1);
        gl.drawArrays(gl.POINTS, 0, this.frames.length);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.boneVertexBuffer);
        gl.vertexAttribPointer(this.shaderProgram.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.boneIndexBuffer);
        gl.drawElements(gl.LINES, this.boneIndices.length, gl.UNSIGNED_SHORT, 0);
        
        gl.uniform1i(this.shaderProgram.special, 0);
        gl.enable(gl.DEPTH_TEST);
    }
	
    CalculateBoundingSphere()
    {
        let bs = {
            center: [0,0,0],
            radius: 0,
        };

        for (const atomic of this.atomics)
        {
            bs = CombineSpheres(bs, this.geometries[atomic.geometryIndex].boundingSphere, this.frames[atomic.frameIndex].worldTransform(this.frames));
        }

        return bs;
    }

}

class RmdAtomic
{
    constructor(reader)
    {
        reader.SeekCur(12);
        this.frameIndex = reader.ReadInt();
        this.geometryIndex = reader.ReadInt();
        this.flag1 = reader.ReadInt();
        this.flag2 = reader.ReadInt();
        let ext = new RmdHeader(reader);
        reader.SeekCur(ext.chunkSize);
    }
}

function ReadRmd(reader)
{
    console.log("Loading rmd file...");
    let Clamps = [];
    let Textures = [];
    let Animations = [];
    while (!reader.EndOfFile())
    {
        let MainHeader = new RmdHeader(reader);
        //MainHeader.Print();

        switch (MainHeader.ChunkId)
        {
            case RmdId.RwClump:
            {
                reader.SeekCur(12);
                let AtomicCount = reader.ReadInt();
                let LightCount = reader.ReadInt();
                let CameraCount = reader.ReadInt();

                let FrameList = new RmdHeader(reader);
                reader.SeekCur(12);
                
                let FrameCount = reader.ReadInt();
                let Frames = []
                for (let i = 0; i < FrameCount; i++)
                    Frames.push(new RmdFrame(reader));
                for (let i = 0; i < FrameCount; i++)
                {
                    let ExtHeader = new RmdHeader(reader);
                    if (ExtHeader.ChunkSize > 0)
                    {
                        let ExtChild = new RmdHeader(reader);
                        if (ExtChild.ChunkId == RmdId.RwHAnimFrameExtension)
                        {
                            let Version = reader.ReadInt();
                            let NameId = reader.ReadInt();
                            let NodeCount = reader.ReadInt();

                            if (NodeCount != 0)
                            {
                                let RootFlags = reader.ReadInt();
                                let KeyFrameSize = reader.ReadInt();
                                
                                for (let j = 0; j < NodeCount; j++)
                                {
                                    let NodeId = reader.ReadInt();
                                    let Index = reader.ReadInt();
                                    let Flags = reader.ReadInt();
                                }
                            }
                        }
                        else
                            reader.SeekCur(ExtChild.ChunkSize);
                    }
                }
                reader.SeekCur(24);
                let GeometryCount = reader.ReadInt();
                let Geometries = []
                for (let i = 0; i < GeometryCount; i++)
                {
                    let Geom = new RmdHeader(reader);
                    Geometries.push(new RmdGeometry(reader));
                }
                Atomics = []
                for (let i = 0; i < AtomicCount; i++)
                {
                    let Atomic = new RmdHeader(reader);
                    Atomics.push(new RmdAtomic(reader));
                }

                let ext = new RmdHeader(reader);
                reader.SeekCur(ext.chunkSize);
                Clamps.push(new RmdClamp(Frames, Geometries, Atomics));
                break;
            }
            case RmdId.RwTextureDictionary:
            {
                reader.SeekCur(12);
                let TextureCount = reader.ReadUShort();
                reader.SeekCur(2);

                for (let i = 0; i < TextureCount; i ++)
                {
                    let TextureNative = new RmdHeader(reader);
                    Textures.push(new RmdTexture(reader));
                }

                reader.SeekSet(MainHeader.EndOffset); //Skip any unsupported data like mip maps
                break;
            }
            case RmdId.RmdTransformOverride:
            {
                Animations.push(new RmdAnimationContainer(reader));
				break;
            }
            case RmdId.RmdParticle: //Particle chunk size is wrong
            {
                reader.SeekCur(4);
                let EplSize = reader.ReadUInt();
                reader.SeekCur(4);
                reader.Align(16);
                reader.SeekCur(EplSize);
                reader.Align(16);
                break;
            }
            default:
            {
                reader.SeekCur(MainHeader.ChunkSize);
                break;
            }
        }
    }

    if (Clamps.length == 0)
        return undefined;

    return {
        clamps: Clamps,
        textures: Textures,
        animations: Animations,
    };
}

function ReadPac(reader)
{
    console.log("Loading pac file...");
    while(reader.Offset < reader.Length - 256)
    {
        let fileName = reader.ReadString(252);
        let size = reader.ReadUInt();
        if (fileName.toLowerCase().endsWith(".rmd"))
            return ReadRmd(reader);
        reader.SeekCur(size);
        reader.Align(64);
    }
}

function ReadFile(arrayBuffer)
{
    let reader = new DecentReader(new DataView(arrayBuffer));
    
    let check = reader.ReadUInt();

    let p = Object.keys(RmdId).find(key => RmdId[key] === check)

    reader.SeekSet(0);

    if (p)
        return ReadRmd(reader);
    else
        return ReadPac(reader);
}