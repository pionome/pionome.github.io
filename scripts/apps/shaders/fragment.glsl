precision mediump float;

uniform sampler2D uDiffuseTex;
uniform int hasTexture;
uniform vec3 uColor;
uniform float uDiffuse;
uniform float uSpecular;
uniform float uAmbient;
uniform int special;
uniform vec3 boneColor;

varying vec3 vNormal;
varying vec2 vUV;
varying vec3 vPosition;

void main(void) {
    if (special == 1) {
        gl_FragColor = vec4(boneColor, 1.0);
        return;
    }

    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
    
    vec3 viewDir = normalize(-vPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    
    float diff = max(dot(vNormal, lightDir), 0.0) * 0.7;
    vec3 diffuse = diff * uColor * uDiffuse;
    
    vec3 ambient = uAmbient * uColor * 0.3;
    
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 16.0);
    vec3 specular = uSpecular * spec * uColor * 0.5;
    
    vec3 lighting = ambient + diffuse * 0.8 + specular * 0.5;
    
    vec4 texColor = vec4(1.0);
    if (hasTexture == 1) {
        texColor = texture2D(uDiffuseTex, vUV);
        if (texColor.a < 0.1) discard;
        texColor.rgb = pow(texColor.rgb, vec3(2.2)); //gamma correction
    }
    
    vec3 finalColor = pow(lighting * texColor.rgb, vec3(1.0/2.2));
    gl_FragColor = vec4(finalColor, texColor.a);
}