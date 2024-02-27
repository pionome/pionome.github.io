class DecentReader //An actually useable reader
{  //(though it doesn't solve the problem of needlesly loading the entire file into memory)
    constructor(dataView)
    {
        this.data = dataView;
        this.offset = 0;
        this.textDecoder = new TextDecoder('shift-jis');
    }
    ReadInt()
    {
        let output = this.data.getInt32(this.offset, true);
        this.offset += 4;
        return output;
    }
    ReadInts(count)
    {
        let output = [];
        for (let i = 0; i < count; i++)
            output.push(this.ReadInt());
        return output;
    }
    ReadUInt()
    {
        let output = this.data.getUint32(this.offset, true);
        this.offset += 4;
        return output;
    }
    ReadUInts(count)
    {
        let output = [];
        for (let i = 0; i < count; i++)
            output.push(this.ReadUInt());
        return output;
    }
    ReadLong()
    {
        let output = this.data.getBigInt64(this.offset, true);
        this.offset += 8;
        return output;
    }
    ReadLongs(count)
    {
        let output = [];
        for (let i = 0; i < count; i++)
            output.push(this.ReadLong());
        return output;
    }
    ReadULong()
    {
        let output = this.data.getBigUint64(this.offset, true);
        this.offset += 8;
        return output;
    }
    ReadULongs(count)
    {
        let output = [];
        for (let i = 0; i < count; i++)
            output.push(this.ReadULong());
        return output;
    }
    ReadShort()
    {
        let output = this.data.getInt16(this.offset, true);
        this.offset += 2;
        return output;
    }
    ReadShorts(count)
    {
        let output = [];
        for (let i = 0; i < count; i++)
            output.push(this.ReadShort());
        return output;
    }
    ReadUShort()
    {
        let output = this.data.getUint16(this.offset, true);
        this.offset += 2;
        return output;
    }
    ReadUShorts(count)
    {
        let output = [];
        for (let i = 0; i < count; i++)
            output.push(this.ReadUShort());
        return output;
    }
    ReadFloat()
    {
        let output = this.data.getFloat32(this.offset, true);
        this.offset += 4;
        return output;
    }
    ReadFloats(count)
    {
        let output = [];
        for (let i = 0; i < count; i++)
            output.push(this.ReadFloat());
        return output;
    }
    ReadDouble()
    {
        let output = this.data.getFloat64(this.offset, true);
        this.offset += 8;
        return output;
    }
    ReadDoubles(count)
    {
        let output = [];
        for (let i = 0; i < count; i++)
            output.push(this.ReadDouble());
        return output;
    }
    ReadByte()
    {
        let output = this.data.getUint8(this.offset, true);
        this.offset += 1;
        return output;
    }
    ReadBytes(count)
    {
        let output = [];
        for (let i = 0; i < count; i++)
            output.push(this.ReadByte());
        return output;
    }
    ReadHalf()
    {
        let byte = this.ReadByte();
        let first = (byte >> 4) & 0xf;
        let second = byte & 0xf;
        return [first,second]
    }
    ReadHalfes(count)
    {
        let output = [];
        for (let i = 0; i < count; i++)
            output.push(this.ReadHalf());
        return output;
    }
    ReadSByte()
    {
        let output = this.data.getInt8(this.offset, true);
        this.offset += 1;
        return output;
    }
    ReadSBytes(count)
    {
        let output = [];
        for (let i = 0; i < count; i++)
            output.push(this.ReadSByte());
        return output;
    }
    ReadString(size)
    {
        let bytes = [];
        for (let b of this.ReadBytes(size))
            if (b != 0)    
                bytes.push(b);
        return this.textDecoder.decode(new Uint8Array(bytes));
    }
    SetEncoding(name)
    {
        this.textDecoder = new TextDecoder(name);
    }
    SeekSet(offset)
    {
        this.offset = offset;
    }
    SeekCur(offset)
    {
        this.offset += offset;
    }
    SeekEnd(offset)
    {
        this.offset = this.data.byteLength - offset;
    }
    Align(alignment)
    {
        this.offset = (this.offset + (alignment-1)) & ~(alignment-1);
    }

    get Offset()
    {
        return this.offset;
    }

    get Length()
    {
        return this.data.byteLength;
    }

    EndOfFile()
    {
        if (this.offset >= this.data.byteLength)
            return true;
        else
            return false;
    }
}