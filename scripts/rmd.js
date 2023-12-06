mat4 = glMatrix.mat4;
vec3 = glMatrix.vec3;

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

    worldTransform(frames)
    {
        let output = mat4.clone(this.transform);
        if (this.parentIndex > -1)
            mat4.multiply(output, frames[this.parentIndex].worldTransform(frames), output);
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
    Use(gl, textures, shaderProgram)
    {
        gl.uniform1i(shaderProgram.hasTexture, this.hasTexture);
        gl.uniform3f(shaderProgram.uColor, this.color[0], this.color[1], this.color[2]);
        gl.uniform1f(shaderProgram.uAmbient, this.ambient);
        gl.uniform1f(shaderProgram.uSpecular, this.specular);
        gl.uniform1f(shaderProgram.uDiffuse, this.diffuse);
        if (this.hasTexture == 1)
        {
            for (let i = 0; i < textures.length; i++)
            {
                if (textures[i].Name == this.textureName)
                    textures[i].Use(gl);
            }
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
        reader.SeekCur(GeomExt.chunkSize);
    }
    Bind(gl, shaderProgram)
    {
        this.shaderProgram = shaderProgram;
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

        this.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);

        this.indexBuffers = [];
        for (let i = 0; i < this.meshes.length; i++)
        {
            const indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.meshes[i], gl.STATIC_DRAW);
            this.indexBuffers.push(indexBuffer);
        }
    }
    Draw(gl, textures) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(this.shaderProgram.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shaderProgram.aVertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(this.shaderProgram.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shaderProgram.aVertexNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(this.shaderProgram.aVertexUV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shaderProgram.aVertexUV);

        for (let i = 0; i < this.indexBuffers.length; i++)
        {
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
    constructor(frames, geometries, atomics)
    {
        this.frames = frames;
        this.geometries = geometries;
        this.atomics = atomics;
    }
    Bind(gl, shaderProgram)
    {
        this.uModelMatrix = shaderProgram.uModelMatrix;
        for (const geom of this.geometries)
        {
            geom.Bind(gl, shaderProgram);
        }
    }
    Draw(gl, textures)
    {
        for (const atomic of this.atomics)
        {
            gl.uniformMatrix4fv(this.uModelMatrix, false, this.frames[atomic.frameIndex].worldTransform(this.frames));
            this.geometries[atomic.geometryIndex].Draw(gl,textures);
        }
    }

    BindBones(gl,shaderProgram)
    {
        this.boneVertices = [];
        for (const frame of this.frames)
        {
            let bone = vec3.create();
            let trs = frame.worldTransform(this.frames);
            mat4.getTranslation(bone, trs);
            this.boneVertices.push(bone[0]);
            this.boneVertices.push(bone[1]);
            this.boneVertices.push(bone[2]);
        }
        this.boneIndices = [];

        for (let i = 0; i < this.frames.length; i++)
        {
            this.boneIndices.push(i);
            if (this.frames[i].parentIndex > -1)
                this.boneIndices.push(this.frames[i].parentIndex);
            else
                this.boneIndices.push(i);
        }
        this.boneIndices = new Uint16Array(this.boneIndices);

        this.boneIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.boneIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.boneIndices, gl.STATIC_DRAW);

        this.shaderProgram = shaderProgram;
        this.boneVertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.boneVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.boneVertices), gl.STATIC_DRAW);

    }
    DrawBones(gl)
    {
        gl.uniformMatrix4fv(this.uModelMatrix, false, mat4.create());
        gl.uniform1i(this.shaderProgram.special, 1);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.boneVertexBuffer);
        gl.vertexAttribPointer(this.shaderProgram.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shaderProgram.aVertexPosition);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.boneIndexBuffer);
        gl.drawArrays(gl.POINTS, 0, this.boneVertices.length);
        gl.drawElements(gl.LINES, this.boneIndices.length, gl.UNSIGNED_SHORT, 0);
        gl.uniform1i(this.shaderProgram.special, 0);
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

function ReadRmd(reader)
{
    console.log("Loading rmd file...");
    let Clamps = [];
    let Textures = [];
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