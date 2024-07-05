class DistortionHoverEffect {
  constructor(options) {
    this.parent = options.parent;
    this.image1 = options.image1;
    this.image2 = options.image2;
    this.displacementImage = options.displacementImage;
    this.intensity = options.intensity || 0.5;
    this.speed = options.speed || 1.0;

    this.init();
  }

  init() {
    console.log(`Initializing DistortionHoverEffect for ${this.parent}`);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(
      this.parent.offsetWidth / -2,
      this.parent.offsetWidth / 2,
      this.parent.offsetHeight / 2,
      this.parent.offsetHeight / -2,
      1,
      1000
    );
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.parent.offsetWidth, this.parent.offsetHeight);
    this.parent.appendChild(this.renderer.domElement);

    this.loadTextures();
  }

  loadTextures() {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = '';

    this.texture1 = loader.load(this.image1, () => console.log(`Loaded image1: ${this.image1}`));
    this.texture2 = loader.load(this.image2, () => console.log(`Loaded image2: ${this.image2}`));
    this.disp = loader.load(this.displacementImage, () => {
      console.log(`Loaded displacement image: ${this.displacementImage}`);
      this.setupScene();
    });

    this.texture1.magFilter = this.texture2.magFilter = THREE.LinearFilter;
    this.texture1.minFilter = this.texture2.minFilter = THREE.LinearFilter;

    this.texture1.anisotropy = this.texture2.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
  }

  setupScene() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        effectFactor: { type: 'f', value: this.intensity },
        dispFactor: { type: 'f', value: 0.0 },
        texture: { type: 't', value: this.texture1 },
        texture2: { type: 't', value: this.texture2 },
        disp: { type: 't', value: this.disp }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D texture;
        uniform sampler2D texture2;
        uniform sampler2D disp;
        uniform float dispFactor;
        uniform float effectFactor;

        void main() {
          vec2 uv = vUv;
          vec4 disp = texture2D(disp, uv);

          vec2 distortedPosition1 = uv + effectFactor * dispFactor * (disp.rg - 0.5);
          vec2 distortedPosition2 = uv - effectFactor * (1.0 - dispFactor) * (disp.rg - 0.5);

          vec4 texture1 = texture2D(texture, distortedPosition1);
          vec4 texture2 = texture2D(texture2, distortedPosition2);

          gl_FragColor = mix(texture1, texture2, dispFactor);
        }
      `,
      transparent: true,
      opacity: 1.0
    });

    const geometry = new THREE.PlaneBufferGeometry(this.parent.offsetWidth, this.parent.offsetHeight, 1);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);

    this.addEvents();
    this.animate();
  }

  addEvents() {
    this.parent.addEventListener('mouseenter', () => {
      gsap.to(this.material.uniforms.dispFactor, { value: 1.0, duration: this.speed });
    });

    this.parent.addEventListener('mouseleave', () => {
      gsap.to(this.material.uniforms.dispFactor, { value: 0.0, duration: this.speed });
    });

    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    this.camera.left = this.parent.offsetWidth / -2;
    this.camera.right = this.parent.offsetWidth / 2;
    this.camera.top = this.parent.offsetHeight / 2;
    this.camera.bottom = this.parent.offsetHeight / -2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.parent.offsetWidth, this.parent.offsetHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
  }
}
