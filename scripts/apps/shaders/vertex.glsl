attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aVertexUV;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform int hasSkin;

varying vec3 vNormal;
varying vec2 vUV;
varying vec3 vPosition;

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
    vec4 worldPosition = uModelMatrix * vec4(aVertexPosition, 1.0);
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
    
    mat3 model3x3 = mat3(
        uModelMatrix[0].xyz,
        uModelMatrix[1].xyz,
        uModelMatrix[2].xyz
    );
    
    mat3 normalMatrix = transpose(inverse(model3x3));
    vNormal = normalize(normalMatrix * aVertexNormal);
    
    vUV = aVertexUV;
    vPosition = worldPosition.xyz;
}