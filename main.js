
import { KeyDisplay } from './utils';
import { CharacterControls } from './characterControls';
import { ZombieControl } from './zombieControl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import CannonDebugger from 'cannon-es-debugger';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';


var WIDTH = 200;
var LENGTH = 200;
var bullets;
var positionX = 0;
var positionZ = 0;
var positionY = 0;
let widdth=185;

let isButtonClicked = false;
let isPlayButtonClicked = false;
let isReplayButtonClicked = false;

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const otherAudioFilePath = 'stranger-things-124008.mp3'; // Replace with the correct path to your other audio file
let otherAudioBuffer = null;
let shootingBuffer = null;


function loadOtherSound() {
  const audioLoader = new THREE.AudioLoader();

  audioLoader.load(otherAudioFilePath, (buffer) => {
    otherAudioBuffer = buffer;
    console.log('Other audio loaded.');
  }, undefined, () => {
    console.error('Failed to load other audio.');
  });
}

function playOtherSound() {
  if (otherAudioBuffer) {
    const source = audioContext.createBufferSource();
    source.buffer = otherAudioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    console.log('Playing other sound.');
  } else {
    console.error('Other audio buffer not available.');
  }
}

function loadShootingSound(url) {
  
  const request = new XMLHttpRequest();
  
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  request.onload = () => {
    audioContext.decodeAudioData(request.response, (buffer) => {
      shootingBuffer = buffer;
    });
  };

  request.send();
}

function playShootingSound() {
  if (shootingBuffer) {
    const source = audioContext.createBufferSource();
    source.buffer = shootingBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  }
}


function initScene() {

const aspect = window.innerWidth / window.innerHeight;
let insetWidth, insetHeight;
const clock = new THREE.Clock();
const gameWorld = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70,aspect,0.01,500);
camera.position.set(5, 5, 0);
camera.lookAt(0,0,0);
camera.name = 'PlayerCam';

// CAM2
let cameraTop = new THREE.PerspectiveCamera(75,aspect,0.01,1000);

cameraTop.position.set(0, 60, 0);
cameraTop.lookAt(0,0,0);
cameraTop.name = "OverheadCam";
// camera.add(cameraTop);
gameWorld.add(camera);

const physicsWorld = new CANNON.World({
    gravity : new CANNON.Vec3(0, -9.8, 0)
});

let characterControls;

function model(){
    const cylinder = new CANNON.Cylinder(0.5,0.5,2, 16);
    const cylinderPhysicsWorld = new CANNON.Body({
        mass: 10,
        shape: cylinder, 
    });
    cylinderPhysicsWorld.position.y = 1;
    
    cylinderPhysicsWorld.angularFactor.set(0,0,0);
    physicsWorld.addBody(cylinderPhysicsWorld);

    new GLTFLoader().load('eve.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            if (object.isMesh) object.castShadow = true;
        });
        model.scale.set(2,2,2);
        gameWorld.add(model);

        const gltfAnimations = gltf.animations;
        const mixer = new THREE.AnimationMixer(model);
        const animationsMap = new Map();
        gltfAnimations.forEach((a) => {
            animationsMap.set(a.name, mixer.clipAction(a));
            console.log(a.name);
        });
        characterControls = new CharacterControls(model, mixer, animationsMap, orbitControls, camera, 'Idle', cylinderPhysicsWorld, cameraTop);
    });
}

let zombies = [];

function zombie(){
    for (let i = 0; i < 4; i++){

        const cylinder = new CANNON.Cylinder(0.5,0.5,2, 16);
        const cylinderPhysicsWorld1 = new CANNON.Body({
            mass: 10,
            shape: cylinder, 
        });
        cylinderPhysicsWorld1.position.set(-40 + (40 * i),0,-40);
        
        cylinderPhysicsWorld1.angularFactor.set(0,0,0);
        physicsWorld.addBody(cylinderPhysicsWorld1);
    
        new GLTFLoader().load('zombie.glb', function (gltf) {
            const model = gltf.scene;
            model.traverse(function (object) {
                if (object.isMesh) object.castShadow = true;
            });
            model.scale.set(1.5,1.5,1.5);
            gameWorld.add(model);
    
            const gltfAnimations = gltf.animations;
            const mixer = new THREE.AnimationMixer(model);
            const animationsMap = new Map();
            gltfAnimations.forEach((a) => {
                animationsMap.set(a.name, mixer.clipAction(a));
                // console.log(a.name);
            });
            const zombieControl = new ZombieControl(model, mixer, animationsMap, 'Walking', cylinderPhysicsWorld1, bullets);
            zombies.push(zombieControl);
        });
    }
}

const keysPressed = {};
const keyDisplayQueue = new KeyDisplay();
document.addEventListener('keydown', (event) => {
    keyDisplayQueue.keyPressed(event.key);
    if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle();
        // gameWorld.add(characterControls.shooting());
    }
    else if(event.code === "Space" && characterControls) {
        characterControls.switchToFire();
        gameWorld.add(characterControls.shooting());
    }
    else {
        keysPressed[event.key.toLowerCase()] = true;
    }
}, false);
document.addEventListener('keyup', (event) => {
    characterControls.stopFire();
    keyDisplayQueue.keyNotPressed(event.key);
    keysPressed[event.key.toLowerCase()] = false;
}, false);

function ground() {
    const groundPhysicsWorld = new CANNON.Body({
        type : CANNON.Body.STATIC, 
        shape : new CANNON.Plane(),
    });

    groundPhysicsWorld.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    physicsWorld.addBody(groundPhysicsWorld);

    const textureLoader = new THREE.TextureLoader();
    const sandBaseColor = textureLoader.load('grass.jpg');

    const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
    
    
    const material = new THREE.MeshStandardMaterial({map: sandBaseColor, 
        mapping: THREE.SphericalReflectionMapping});
    wrapAndRepeatTexture(material.map, 10);

    const floor = new THREE.Mesh(geometry, material);
    floor.receiveShadow = true;
    floor.rotation.x = -Math.PI / 2;
    gameWorld.add(floor);

    const skyboxGeometry = new THREE.BoxGeometry(500, 500, 500);
    const skyboxMaterials = [
      new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('skyBoxBack.png'), side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('skyBoxFront.png'), side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('skyBoxTop.png'), side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('skyBoxBottom.png'), side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('skyBoxRight.png'), side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load('skyBoxLeft.png'), side: THREE.BackSide }),
    ];
    
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
    skybox.rotation.set(0, Math.PI / 2, 0);
    gameWorld.add(skybox);
}

function road(){
    const textureLoader = new THREE.TextureLoader();

    //intialize the texture
    const crossSectionTexture = textureLoader.load("fillRoad.jpg");
    const mainSectionTextureNS = textureLoader.load('road.jpg');
    const mainSectionTextureWE = textureLoader.load('roadH.jpg');
    const backroadSectionTexture = textureLoader.load('backRoad.jpg');
    const passageTexture = textureLoader.load('backRoad.jpg');
    const sqPassageTexture = textureLoader.load('backRoad.jpg');


    //initialize the geometry
    const crossSectionGeometry = new THREE.BoxGeometry(20, 0.02, 20);
    const crossSectionGeometry1 = new THREE.BoxGeometry(10, 0.02, 25);
    const crossSectionGeometry2 = new THREE.BoxGeometry(10, 0.02, 10);
    const crossSectionGeometry3 = new THREE.BoxGeometry(15, 0.02, 10);
    const crossSectionGeometry4 = new THREE.BoxGeometry(20, 0.02, 15);
    const mainSectionGeometryNS = new THREE.BoxGeometry(20, 0.01, 200);
    const mainSectionGeometryWE = new THREE.BoxGeometry(200, 0.01, 20);
    const backRoadGeometry = new THREE.BoxGeometry(10, 0.005, 90);
    const backRoadGeometryWE = new THREE.BoxGeometry(90, 0.006, 10);
    const passageGeometry = new THREE.BoxGeometry(60, 0.004, 5);
    const passageGeometry1 = new THREE.BoxGeometry(20, 0.0041, 15);
    const passageGeometry2 = new THREE.BoxGeometry(5, 0.004, 25);
    const passageGeometry3 = new THREE.BoxGeometry(50, 0.0041, 5);
    const passageGeometry4 = new THREE.BoxGeometry(6, 0.0041, 40);
    const passageGeometry5 = new THREE.BoxGeometry(4, 0.0041, 40);
    const passageGeometry7 = new THREE.BoxGeometry(60, 0.0041, 6);

    //initialize the material
    const crossSectionMaterial = new THREE.MeshStandardMaterial({ map: crossSectionTexture, receiveShadow : true});
    const mainSectionMaterialNS = new THREE.MeshStandardMaterial({ map: mainSectionTextureNS, receiveShadow : true});
    const mainSectionMaterialWE = new THREE.MeshStandardMaterial({ map: mainSectionTextureWE, receiveShadow : true});
    const backRoadMaterial = new THREE.MeshStandardMaterial({ map: backroadSectionTexture, receiveShadow : true});
    const passageMaterial = new THREE.MeshStandardMaterial({ map: passageTexture, receiveShadow : true});
    const sqPassageMaterial = new THREE.MeshStandardMaterial({ map: sqPassageTexture, receiveShadow : true});

    //fit the Texture by resizing the texture
    vResizeAndWrapTexture(backRoadMaterial.map);
    wrapAndRepeatTexture(crossSectionMaterial.map, 2);
    vResizeAndWrapTexture(mainSectionMaterialNS.map);
    hResizeAndWrapTexture(mainSectionMaterialWE.map);
    hResizeAndWrapTexture(passageMaterial.map);
    wrapAndRepeatTexture(sqPassageMaterial.map, 4);

    //create the object
    const crossSection = new THREE.Mesh(crossSectionGeometry, crossSectionMaterial);
    const crossSection1 = new THREE.Mesh(crossSectionGeometry1, crossSectionMaterial);
    const crossSection2 = new THREE.Mesh(crossSectionGeometry2, crossSectionMaterial);
    const crossSection3 = new THREE.Mesh(crossSectionGeometry3, crossSectionMaterial);
    const crossSection4 = new THREE.Mesh(crossSectionGeometry4, crossSectionMaterial);
    const mainSectionNS = new THREE.Mesh(mainSectionGeometryNS, mainSectionMaterialNS);
    const mainSectionWE = new THREE.Mesh(mainSectionGeometryWE, mainSectionMaterialWE);
    const path = new THREE.Mesh(passageGeometry, passageMaterial);
    const path1 = new THREE.Mesh(passageGeometry1, sqPassageMaterial);
    const path2 = new THREE.Mesh(passageGeometry2, backRoadMaterial);
    const path3 = new THREE.Mesh(passageGeometry3, passageMaterial);
    const path4 = new THREE.Mesh(passageGeometry4, backRoadMaterial);
    const path5 = new THREE.Mesh(passageGeometry5, backRoadMaterial);
    const path6 = new THREE.Mesh(passageGeometry4, backRoadMaterial);
    const path7 = new THREE.Mesh(passageGeometry7, passageMaterial);
    const path8 = new THREE.Mesh(passageGeometry7, passageMaterial);
    const backRoad2 = new THREE.Mesh(backRoadGeometry, mainSectionMaterialNS);
    const backRoad3 = new THREE.Mesh(backRoadGeometryWE, mainSectionMaterialWE);


    //enable shadows to be recieved in the object
    crossSection.receiveShadow = true;
    crossSection1.receiveShadow = true;
    crossSection2.receiveShadow = true;
    crossSection3.receiveShadow = true;
    crossSection4.receiveShadow = true;
    mainSectionNS.receiveShadow = true;
    mainSectionWE.receiveShadow = true;
    path.receiveShadow = true;
    path1.receiveShadow = true;
    path2.receiveShadow = true;
    path3.receiveShadow = true;
    path4.receiveShadow = true;
    path5.receiveShadow = true;
    path6.receiveShadow = true;
    path7.receiveShadow = true;
    path8.receiveShadow = true;
    backRoad2.receiveShadow = true;
    backRoad3.receiveShadow = true;

    //adding objects to the world
    gameWorld.add(mainSectionWE);
    gameWorld.add(mainSectionNS);
    gameWorld.add(crossSection);

    crossSection1.position.x = 55;
    crossSection1.position.z = -2;
    gameWorld.add(crossSection1);

    crossSection2.position.x = 55;
    crossSection2.position.z = 95;
    gameWorld.add(crossSection2);

    crossSection3.position.x = 3;
    crossSection3.position.z = 95;
    gameWorld.add(crossSection3);

    crossSection4.position.x = 40;
    crossSection4.position.z = -5;
    gameWorld.add(crossSection4);

    path.position.x = -40;
    path.position.z = 55;
    gameWorld.add(path);

    path1.position.x = -65;
    path1.position.z = 60;
    gameWorld.add(path1);

    path2.position.x = -55;
    path2.position.z = 70;
    gameWorld.add(path2);

    path3.position.x = -30;
    path3.position.z = 75;
    gameWorld.add(path3);

    path4.position.x = 30;
    path4.position.z = 30;
    gameWorld.add(path4);

    path5.position.x = -39;
    path5.position.z = -55;
    gameWorld.add(path5);

    path6.position.x = -65;
    path6.position.z = -55;
    gameWorld.add(path6);

    path7.position.x = -38;
    path7.position.z = -75;
    gameWorld.add(path7);

    path8.position.x = -38;
    path8.position.z = -35;
    gameWorld.add(path8);

    backRoad2.position.x = 55;
    backRoad2.position.z = 55;
    backRoad3.position.z = 95;
    backRoad3.position.x = 55;
    
    gameWorld.add(backRoad2);
    gameWorld.add(backRoad3);
}

function parking(){
    const buildingPhysicsWorld = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(23,15,1)),
    });
    buildingPhysicsWorld.position.set(40,15,-51);
    buildingPhysicsWorld.quaternion.setFromEuler(0, 0 , 0);
    physicsWorld.addBody(buildingPhysicsWorld);

    const buildingPhysicsWorld1 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(19,15,1)),
    });
    buildingPhysicsWorld1.position.set(63,15,-32);
    buildingPhysicsWorld1.quaternion.setFromEuler(0, Math.PI / 2 , 0);
    physicsWorld.addBody(buildingPhysicsWorld1);

    const buildingPhysicsWorld3 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(8,15,1)),
    });
    buildingPhysicsWorld3.position.set(25,15,-15);
    buildingPhysicsWorld3.quaternion.setFromEuler(0, 0 , 0);
    physicsWorld.addBody(buildingPhysicsWorld3);

    const buildingPhysicsWorld4 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(19,15,1)),
    });
    buildingPhysicsWorld4.position.set(17.5,15,-32);
    buildingPhysicsWorld4.quaternion.setFromEuler(0, Math.PI / 2 , 0);
    physicsWorld.addBody(buildingPhysicsWorld4);
    
    const parkWalls = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(2.5,5,1)),
    });
    parkWalls.position.set(-46,5,-45);
    parkWalls.quaternion.setFromEuler(0, 0 , 0);
    physicsWorld.addBody(parkWalls);

    const parkWalls1 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(1.8,5,1)),
    });
    parkWalls1.position.set(-56,5,-45);
    parkWalls1.quaternion.setFromEuler(0, 0 , 0);
    physicsWorld.addBody(parkWalls1);

    const parkWalls2 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(2.5,5,1)),
    });
    parkWalls2.position.set(-44.5,5,-46.5);
    parkWalls2.quaternion.setFromEuler(0, Math.PI / 2, 0);
    physicsWorld.addBody(parkWalls2);

    const parkWalls3 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(4.2,5,1)),
    });
    parkWalls3.position.set(-57,5,-48.2);
    parkWalls3.quaternion.setFromEuler(0, Math.PI / 2, 0);
    physicsWorld.addBody(parkWalls3);

    const parkWalls4 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(5,5,1)),
    });
    parkWalls4.position.set(-44.5, 5, -60);
    parkWalls4.quaternion.setFromEuler(0, Math.PI / 2, 0);
    physicsWorld.addBody(parkWalls4);

    const parkWalls5 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(1.8,5,1)),
    });
    parkWalls5.position.set(-45.5,5,-65);
    parkWalls5.quaternion.setFromEuler(0, 0 , 0);
    physicsWorld.addBody(parkWalls5);

    const parkWalls6 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(4,5,1)),
    });
    parkWalls6.position.set(-57, 5, -62);
    parkWalls6.quaternion.setFromEuler(0, Math.PI / 2, 0);
    physicsWorld.addBody(parkWalls6);
    
    const parkWalls7 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(3.4, 5, 1)),
    });
    parkWalls7.position.set(-55, 5, -65);
    parkWalls7.quaternion.setFromEuler(0, 0, 0);
    physicsWorld.addBody(parkWalls7);
    
    const parkWall = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(2.5,5,1)),
    });
    parkWall.position.set(-21, 5, -45);
    parkWall.quaternion.setFromEuler(0, 0 , 0);
    physicsWorld.addBody(parkWall);

    const parkWall1 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(1.8,5,1)),
    });
    parkWall1.position.set(-31,5,-45);
    parkWall1.quaternion.setFromEuler(0, 0 , 0);
    physicsWorld.addBody(parkWall1);

    const parkWall2 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(2.5,5,1)),
    });
    parkWall2.position.set(-19.5,5,-46.5);
    parkWall2.quaternion.setFromEuler(0, Math.PI / 2, 0);
    physicsWorld.addBody(parkWall2);

    const parkWall3 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(4.2,5,1)),
    });
    parkWall3.position.set(-32,5,-48.2);
    parkWall3.quaternion.setFromEuler(0, Math.PI / 2, 0);
    physicsWorld.addBody(parkWall3);

    const parkWall4 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(5,5,1)),
    });
    parkWall4.position.set(-19.5, 5, -60);
    parkWall4.quaternion.setFromEuler(0, Math.PI / 2, 0);
    physicsWorld.addBody(parkWall4);

    const parkWall5 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(1.8,5,1)),
    });
    parkWall5.position.set(-20.5,5,-65);
    parkWall5.quaternion.setFromEuler(0, 0 , 0);
    physicsWorld.addBody(parkWall5);

    const parkWall6 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(4,5,1)),
    });
    parkWall6.position.set(-32, 5, -62);
    parkWall6.quaternion.setFromEuler(0, Math.PI / 2, 0);
    physicsWorld.addBody(parkWall6);

    const parkWall7 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(3.4, 5, 1)),
    });
    parkWall7.position.set(-30, 5, -65);
    parkWall7.quaternion.setFromEuler(0, 0, 0);
    physicsWorld.addBody(parkWall7);

    const buildingPhysicsWorld5 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(20,20,1)),
    });
    buildingPhysicsWorld5.position.set(30,6,-30);
    buildingPhysicsWorld5.quaternion.setFromEuler(Math.PI / 2, 0 , 0);
    physicsWorld.addBody(buildingPhysicsWorld5);

    const buildingPhysicsWorld6 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(8,8,1)),
    });
    buildingPhysicsWorld6.position.set(55 ,6,-42);
    buildingPhysicsWorld6.quaternion.setFromEuler(Math.PI / 2, 0 , 0);
    physicsWorld.addBody(buildingPhysicsWorld6);

    const buildingPhysicsWorld2 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(7.6,15,1)),
    });
    buildingPhysicsWorld2.position.set(55.2,1,-20);
    buildingPhysicsWorld2.quaternion.setFromEuler(- (70 / 180) * Math.PI, 0 , 0);
    physicsWorld.addBody(buildingPhysicsWorld2);

    new GLTFLoader().load('parking.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        model.scale.set(2,2,1.7);

        new GLTFLoader().load('light.glb', function (gltf) {
            const light = gltf.scene;
            light.traverse(function (object) {
                object.castShadow = true;
                object.receiveShadow = true;
            });
            
            for (let i = 0; i < 7; i++){
                const spotLight = new THREE.PointLight(0xffffff, 2)
                spotLight.position.set(0.7 - (i * 0.2) , 0.1, 0);
                spotLight.distance = 200;
                light.add(spotLight);
                 
            }

            model.add(light);
            light.rotation.set(Math.PI, 0, 0);
            
            light.position.set(0,3.4,0);
        });

        new GLTFLoader().load('light.glb', function (gltf) {
            const light = gltf.scene;
            light.traverse(function (object) {
                object.castShadow = true;
                object.receiveShadow = true;
            });
            
            for (let i = 0; i < 7; i++){
                const spotLight = new THREE.PointLight(0xffffff, 2)
                spotLight.position.set(0.7 - (i * 0.2) , 0.1, 0);
                spotLight.distance = 200;
                light.add(spotLight);
                 
            }

            model.add(light);
            light.rotation.set(Math.PI, 0, 0);
            
            light.position.set(-5, 3.4, -5);
        });

        new GLTFLoader().load('light.glb', function (gltf) {
            const light = gltf.scene;
            light.traverse(function (object) {
                object.castShadow = true;
                object.receiveShadow = true;
            });

            model.add(light);
            light.rotation.set(Math.PI, 0, 0);
            
            light.position.set(5, 3.4, -5);
        });

        new GLTFLoader().load('light.glb', function (gltf) {
            const light = gltf.scene;
            light.traverse(function (object) {
                object.castShadow = true;
                object.receiveShadow = true;
            });

            model.add(light);
            light.rotation.set(Math.PI, 0, 0);
            
            light.position.set(-5,3.4,5);
        });

        new GLTFLoader().load('light.glb', function (gltf) {
            const light = gltf.scene;
            light.traverse(function (object) {
                object.castShadow = true;
                object.receiveShadow = true;
            });
            
            for (let i = 0; i < 7; i++){
                const spotLight = new THREE.PointLight(0xffffff, 2)
                spotLight.position.set(0.7 - (i * 0.2) , 0.1, 0);
                spotLight.distance = 200;
                light.add(spotLight);
                 
            }

            model.add(light);
            light.rotation.set(Math.PI, 0, 0);
            
            light.position.set(5, 3.4, 5);
        });
        gameWorld.add(model);
        
        model.position.y = -0.2;
        model.position.x = 40;
        model.position.z = -32;
    });

    new GLTFLoader().load('park.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        
        model.position.y = 6.42;
        model.position.x = -80;
        model.position.z = -50;

        model.scale.set(0.2,0.2,0.2);
    });

    new GLTFLoader().load('park.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        
        model.position.y = 6.42;
        model.position.x = -55;
        model.position.z = -50;

        // model.rotation.set(0, Math.PI / 2, 0);

        model.scale.set(0.2,0.2,0.2);

    });

    const textureLoader = new THREE.TextureLoader();

    //intialize the texture
    const parkingTexture4 = textureLoader.load("parkingLot4.jpg");

    //initialize the geometry
    const parkingGeometry4 = new THREE.BoxGeometry(30, 0.05, 15);
    
    //initialize the material
    const parkingMaterial4 = new THREE.MeshStandardMaterial({ map: parkingTexture4, receiveShadow : true});
   
    //fit the Texture by resizing the texture
    stretchTexture(parkingMaterial4.map);

    //create the object
    const parking = new THREE.Mesh(parkingGeometry4, parkingMaterial4);

    //enable shadows to be recieved in the object
    parking.receiveShadow = true;

    //adding objects to the world
    parking.position.x = 30;
    parking.position.z = 55;
    gameWorld.add(parking);
}

function light() {
    gameWorld.add(new THREE.AmbientLight(0xffffff, 0.7));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(-60, 100, -10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    gameWorld.add(dirLight);
}

function buildings(){
    const buildingPhysicsWorld = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(12,15,8)),
    });
    buildingPhysicsWorld.position.set(19,15,26.5);
    buildingPhysicsWorld.quaternion.setFromEuler(0, (Math.PI + Math.PI / 2) , 0);
    physicsWorld.addBody(buildingPhysicsWorld);
    
    const buildingPhysicsWorld1 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(12.5,15,8)),
    });
    buildingPhysicsWorld1.position.set(-79,15,-56.5);
    buildingPhysicsWorld1.quaternion.setFromEuler(0, Math.PI / 2 , 0);
    physicsWorld.addBody(buildingPhysicsWorld1);
    
    const buildingPhysicsWorld2 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(12.5,15,8)),
    });
    buildingPhysicsWorld2.position.set(-73.5,15,79);
    buildingPhysicsWorld2.quaternion.setFromEuler(0, Math.PI, 0);
    physicsWorld.addBody(buildingPhysicsWorld2);

    const buildingPhysicsWorld3 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(12,15,8)),
    });
    buildingPhysicsWorld3.position.set(79,15,-33);
    buildingPhysicsWorld3.quaternion.setFromEuler(0, (Math.PI + Math.PI / 2) , 0);
    physicsWorld.addBody(buildingPhysicsWorld3);
    
    const buildingPhysicsWorld4 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(14,15,5)),
    });
    buildingPhysicsWorld4.position.set(30,15,72);
    buildingPhysicsWorld4.quaternion.setFromEuler(0, Math.PI, 0);
    physicsWorld.addBody(buildingPhysicsWorld4);
    
    const buildingPhysicsWorld5 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(14,15,5)),
    });
    buildingPhysicsWorld5.position.set(72,15,70);
    buildingPhysicsWorld5.quaternion.setFromEuler(0, (Math.PI  + (Math.PI / 2)), 0);
    physicsWorld.addBody(buildingPhysicsWorld5);
    
    const buildingPhysicsWorld6 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(12,20,8)),
    });
    buildingPhysicsWorld6.position.set(70,20,31);
    buildingPhysicsWorld6.quaternion.setFromEuler(0, (Math.PI  + (Math.PI / 2)), 0);
    physicsWorld.addBody(buildingPhysicsWorld6);
    
    const buildingPhysicsWorld7 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(14,20,8)),
    });
    buildingPhysicsWorld7.position.set(40,20,30);
    buildingPhysicsWorld7.quaternion.setFromEuler(0, (Math.PI / 2), 0);
    physicsWorld.addBody(buildingPhysicsWorld7);
    
    const buildingPhysicsWorld8 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(14,15,5)),
    });
    buildingPhysicsWorld8.position.set(30,15,82);
    // buildingPhysicsWorld8.quaternion.setFromEuler(0, Math.PI, 0);
    physicsWorld.addBody(buildingPhysicsWorld8);

    const buildingPhysicsWorld9 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(20,20,7.5)),
    });
    buildingPhysicsWorld9.position.set(90,20,65);
    buildingPhysicsWorld9.quaternion.setFromEuler(0, Math.PI / 2, 0);
    physicsWorld.addBody(buildingPhysicsWorld9);
    
    const buildingPhysicsWorld10 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(14,25,4)),
    });
    buildingPhysicsWorld10.position.set(48,25,-80);
    buildingPhysicsWorld10.quaternion.setFromEuler(0, Math.PI / 2, 0);
    physicsWorld.addBody(buildingPhysicsWorld10);

    const buildingPhysicsWorld11 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(14,25,4)),
    });
    buildingPhysicsWorld11.position.set(38,25,-82);
    buildingPhysicsWorld11.quaternion.setFromEuler(0, Math.PI / 2, 0);
    physicsWorld.addBody(buildingPhysicsWorld11);
    
    const buildingPhysicsWorld12 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(14,25,4)),
    });
    buildingPhysicsWorld12.position.set(33,25,-83);
    buildingPhysicsWorld12.quaternion.setFromEuler(0, 0, 0);
    physicsWorld.addBody(buildingPhysicsWorld12);
    
    const buildingPhysicsWorld13 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(14,25,4)),
    });
    buildingPhysicsWorld13.position.set(53,25,-81);
    buildingPhysicsWorld13.quaternion.setFromEuler(0, 0, 0);
    physicsWorld.addBody(buildingPhysicsWorld13);
    
    const buildingPhysicsWorld14 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(7.5,25,8.5)),
    });
    buildingPhysicsWorld14.position.set(74,25,-88);
    buildingPhysicsWorld14.quaternion.setFromEuler(0, ((13 * Math.PI) / 180), 0);
    physicsWorld.addBody(buildingPhysicsWorld14);
    
    const buildingPhysicsWorld15 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(12,25,8)),
    });
    buildingPhysicsWorld15.position.set(32,25,-70);
    buildingPhysicsWorld15.quaternion.setFromEuler(0, 0, 0);
    physicsWorld.addBody(buildingPhysicsWorld15);
    
    const buildingPhysicsWorld16 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(6.5,25,5)),
    });
    buildingPhysicsWorld16.position.set(26.5,25,-58);
    buildingPhysicsWorld16.quaternion.setFromEuler(0, 0, 0);
    physicsWorld.addBody(buildingPhysicsWorld16);
    
    const buildingPhysicsWorld20 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(31.5,20,4)),
    });
    buildingPhysicsWorld20.position.set(-61,20,-27);
    buildingPhysicsWorld20.quaternion.setFromEuler(0, 0, 0);
    physicsWorld.addBody(buildingPhysicsWorld20);

    const cylinder = new CANNON.Cylinder(3.1, 3.1, 40, 10);
    const cylinderPhysicsWorld = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape: cylinder, 
    });
    cylinderPhysicsWorld.position.set(-50.25,20,-23);
    cylinderPhysicsWorld.angularFactor.set(0,0,0);
    physicsWorld.addBody(cylinderPhysicsWorld);

    const cylinderPhysicsWorld1 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape: cylinder, 
    });
    cylinderPhysicsWorld1.position.set(-71,20,-23);
    cylinderPhysicsWorld1.angularFactor.set(0,0,0);
    physicsWorld.addBody(cylinderPhysicsWorld1);
    
    const buildingPhysicsWorld21 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(31.5,20,4)),
    });
    buildingPhysicsWorld21.position.set(-61,20,27);
    buildingPhysicsWorld21.quaternion.setFromEuler(0, Math.PI, 0);
    physicsWorld.addBody(buildingPhysicsWorld21);

    const cylinderPhysicsWorld3 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape: cylinder, 
    });
    cylinderPhysicsWorld3.position.set(-48.5,20,23);
    cylinderPhysicsWorld3.angularFactor.set(0,0,0);
    physicsWorld.addBody(cylinderPhysicsWorld3);

    const cylinderPhysicsWorld2 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape: cylinder, 
    });
    cylinderPhysicsWorld2.position.set(-69.4,20,23);
    cylinderPhysicsWorld2.angularFactor.set(0,0,0);
    physicsWorld.addBody(cylinderPhysicsWorld2);
    
    const buildingPhysicsWorld22 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(12.5,15,8)),
    });
    buildingPhysicsWorld22.position.set(-68.5,15,-90);
    buildingPhysicsWorld22.quaternion.setFromEuler(0, 0, 0);
    physicsWorld.addBody(buildingPhysicsWorld22);

    const buildingPhysicsWorld23 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(12.5,15,8)),
    });
    buildingPhysicsWorld23.position.set(-28.5,15,-90);
    buildingPhysicsWorld23.quaternion.setFromEuler(0, 0 , 0);
    physicsWorld.addBody(buildingPhysicsWorld23);

    const buildingPhysicsWorld24 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(12,20,8)),
    });
    buildingPhysicsWorld24.position.set(-90,20,49);
    buildingPhysicsWorld24.quaternion.setFromEuler(0, ((Math.PI / 2)), 0);
    physicsWorld.addBody(buildingPhysicsWorld24);

    const buildingPhysicsWorld25 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(12.5,20,8)),
    });
    buildingPhysicsWorld25.position.set(-48.5,20,40);
    buildingPhysicsWorld25.quaternion.setFromEuler(0, 0, 0);
    physicsWorld.addBody(buildingPhysicsWorld25);

    const buildingPhysicsWorld26 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape : new CANNON.Box(new CANNON.Vec3(12.5,20,8)),
    });
    buildingPhysicsWorld26.position.set(-31,20,90);
    buildingPhysicsWorld26.quaternion.setFromEuler(0, Math.PI, 0);
    physicsWorld.addBody(buildingPhysicsWorld26);

    new GLTFLoader().load('officeBuildingModel.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        
        model.quaternion.copy(buildingPhysicsWorld1.quaternion);
        model.position.x = -79;
        model.position.z = -55;
    });

    new GLTFLoader().load('officeBuildingModel.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        // model.position.y = 20;
        gameWorld.add(model);

        model.quaternion.copy(buildingPhysicsWorld.quaternion);
        model.position.x = 19;
        model.position.z = 25;
    });

    new GLTFLoader().load('officeBuildingModel.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        // model.position.y = 20;
        gameWorld.add(model);
        
        
        model.quaternion.copy(buildingPhysicsWorld2.quaternion);
        model.position.x = -72;
        model.position.z = 79;
    });

    new GLTFLoader().load('officeBuildingModel.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        // model.position.y = 20;
        gameWorld.add(model);
        
        model.quaternion.copy(buildingPhysicsWorld3.quaternion);
        model.position.x = 79;
        model.position.z = -35;
    });

    new GLTFLoader().load('buildingModel2.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        // model.position.y = 20;
        gameWorld.add(model);
        model.quaternion.copy(buildingPhysicsWorld4.quaternion);
        
        model.position.y = 5;
        model.position.x = 30;
        model.position.z = 70;
    });


    new GLTFLoader().load('buildingModel2.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        // model.position.y = 20;
        gameWorld.add(model);
        
        model.quaternion.copy(buildingPhysicsWorld5.quaternion);
        model.position.y = 5;
        model.position.x = 70;
        model.position.z = 70;
    });

    new GLTFLoader().load('officeBuildingModel.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        // model.position.y = 20;
        gameWorld.add(model);
        
        model.quaternion.copy(buildingPhysicsWorld6.quaternion);
        // model.position.y = 5;
        model.position.x = 70;
        model.position.z = 30;
    });

    new GLTFLoader().load('officeBuildingModel.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        
        model.quaternion.copy(buildingPhysicsWorld7.quaternion);
        model.position.x = 40;
        model.position.z = 30;
    });

    new GLTFLoader().load('buildingModel2.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        model.quaternion.copy(buildingPhysicsWorld8.quaternion);
        
        model.position.y = 5;
        model.position.x = 30;
        model.position.z = 84;
    });
    
    new GLTFLoader().load('buildingModel5.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        model.scale.set(0.4, 0.4, 0.4);
        
        model.position.y = 1
        model.position.x = 90;
        model.position.z = 94;
    });

    new GLTFLoader().load('officeBuildingModel2.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        model.scale.set(4, 4, 4);

        model.position.x = 50;
        model.position.z = -80;
    });
    
    new GLTFLoader().load('mallBuildingModel.glb', function (gltf) {
            const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        model.position.y = -1;
        gameWorld.add(model);
        model.quaternion.copy(buildingPhysicsWorld20.quaternion);
        
        model.position.x = -60;
        model.position.z = -30;
    });


    new GLTFLoader().load('mallBuildingModel.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        model.position.y = -1;
        gameWorld.add(model);
        model.quaternion.copy(buildingPhysicsWorld21.quaternion);
        
        model.position.x = -60;
        model.position.z = 30;
    });

    new GLTFLoader().load('officeBuildingModel.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        
        model.quaternion.copy(buildingPhysicsWorld22.quaternion);
        model.position.x = -70;
        model.position.z = -90;
    });

    new GLTFLoader().load('officeBuildingModel.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        // model.position.y = 20;
        gameWorld.add(model);
        
        model.quaternion.copy(buildingPhysicsWorld23.quaternion);
        model.position.x = -30;
        model.position.z = -90;
    });

    new GLTFLoader().load('officeBuildingModel.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        
        model.quaternion.copy(buildingPhysicsWorld24.quaternion);
        model.position.x = -90;
        model.position.z = 50;
    });

    new GLTFLoader().load('officeBuildingModel.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        
        model.quaternion.copy(buildingPhysicsWorld25.quaternion);
        model.position.x = -50;
        model.position.z = 40;
    });

    
    new GLTFLoader().load('officeBuildingModel.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        
        model.quaternion.copy(buildingPhysicsWorld26.quaternion);
        model.position.x = -30;
        model.position.z = 90;
    });
}

function extras(){
    const cylinder = new CANNON.Cylinder(1.5, 1.5, 10, 10);
    const statue = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape: cylinder, 
    });
    statue.position.set(-65 ,0, 60);
    statue.angularFactor.set(0,0,0);
    physicsWorld.addBody(statue);

    new GLTFLoader().load('park_bench.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        model.scale.set(0.016, 0.016, 0.016);
        gameWorld.add(model);
        
        model.position.set(-60, 0, 53);
    });

    new GLTFLoader().load('park_bench.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        model.scale.set(0.016, 0.016, 0.016);
        gameWorld.add(model);
        
        model.position.set(-70, 0, 53);
    });

    new GLTFLoader().load('park_bench.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        model.scale.set(0.016, 0.016, 0.016);
        model.rotation.set(0, Math.PI / 2, 0);
        gameWorld.add(model);
        
        model.position.set(-73, 0, 60);
    });

    new GLTFLoader().load('park_bench.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        model.scale.set(0.016, 0.016, 0.016);
        model.rotation.set(0, Math.PI, 0);
        gameWorld.add(model);
        
        model.position.set(-60, 0, 66);
    });

    new GLTFLoader().load('park_bench.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        model.scale.set(0.016, 0.016, 0.016);
        model.rotation.set(0, Math.PI, 0);
        gameWorld.add(model);
        
        model.position.set(-70, 0, 66);
    });

    new GLTFLoader().load('statue.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            if(object.isMesh){
                object.castShadow = true;
                object.receiveShadow = true;
                object.material.reflectivity = 0.5;
                object.material.metalness = 0.5;
            }
        });
        gameWorld.add(model);
        
        model.scale.set(4, 4, 4);
        model.position.set(-65, 2, 60);
    });

    const geometry = new THREE.CircleGeometry(8, 32);    
    const textureLoader = new THREE.TextureLoader();
    const sandBaseColor = textureLoader.load('ground.jpg');
    const material = new THREE.MeshStandardMaterial({map: sandBaseColor, 
        mapping: THREE.SphericalReflectionMapping});
    stretchTexture(material.map);

    const circle = new THREE.Mesh(geometry, material);
    circle.receiveShadow = true;
    circle.material.reflectivity = 1;
    circle.material.metalness = 1;
    circle.rotation.x = -Math.PI / 2;
    circle.position.set(-41, 0.001, 65);
    gameWorld.add(circle);

    new GLTFLoader().load('untitled1.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            if(object.isMesh){
                object.castShadow = true;
                object.receiveShadow = true;
                object.material.transparency = false;
                object.material.reflectivity = 0.8;
            }
            
        });
        gameWorld.add(model);
        
        model.scale.set(0.4, 0.8, 0.3);
        model.position.set(-40, 0.15, 65);
    });

    const cylinderTree = new CANNON.Cylinder(0.5, 0.5, 10, 10);
    const tree = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape: cylinderTree, 
    });
    tree.position.set(-22.7, 0, 70);
    tree.angularFactor.set(0,0,0);
    physicsWorld.addBody(tree);

    const tree2 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape: cylinderTree, 
    });
    tree2.position.set(-17.7, 0, 60);
    tree2.angularFactor.set(0,0,0);
    physicsWorld.addBody(tree2);

    const tree3 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape: cylinderTree, 
    });
    tree3.position.set(-27.7, 0, 65);
    tree3.angularFactor.set(0,0,0);
    physicsWorld.addBody(tree3);

    new GLTFLoader().load('deadTree.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            if(object.isMesh){
                object.castShadow = true;
                object.receiveShadow = true;
            }
            
        });
        gameWorld.add(model);
        
        model.scale.set(4, 4, 4);
        model.position.set(-30, 5, 40);
    });

    new GLTFLoader().load('deadTree.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            if(object.isMesh){
                object.castShadow = true;
                object.receiveShadow = true;
            }
            
        });
        gameWorld.add(model);
        
        model.scale.set(4, 4, 4);
        model.position.set(-20, 5, 35);
    });

    new GLTFLoader().load('deadTree.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        
        model.scale.set(4, 4, 4);
        model.position.set(-25, 5, 45);
    });

    const tree4 = new CANNON.Body({
        type : CANNON.Body.STATIC,
        shape: cylinderTree, 
    });
    tree4.position.set(-22.7, 0, -20);
    tree4.angularFactor.set(0,0,0);
    physicsWorld.addBody(tree4);

    new GLTFLoader().load('deadTree.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object) {
            object.castShadow = true;
            object.receiveShadow = true;
        });
        gameWorld.add(model);
        
        model.scale.set(4, 4, 4);
        model.position.set(-25, 5, -45);
    });

    for (let i = 0; i < 4; i++){
        const trees = new CANNON.Body({
            type : CANNON.Body.STATIC,
            shape: cylinderTree, 
        });
        trees.position.set(-22.7 - (10 * i), 0, -40);
        trees.angularFactor.set(0,0,0);
        physicsWorld.addBody(trees);

        new GLTFLoader().load('deadTree.glb', function (gltf) {
            const model = gltf.scene;
            model.traverse(function (object) {
                object.castShadow = true;
                object.receiveShadow = true;
            });
            gameWorld.add(model);
            
            model.scale.set(4, 4, 4);
            model.position.set(-25 - (10 * i), 5, -65);
        });
    }

    for (let i = 0; i < 4; i++){
        const trees = new CANNON.Body({
            type : CANNON.Body.STATIC,
            shape: cylinderTree, 
        });
        trees.position.set(-22.7 - (10 * i), 0, -70);
        trees.angularFactor.set(0,0,0);
        physicsWorld.addBody(trees);

        new GLTFLoader().load('deadTree.glb', function (gltf) {
            const model = gltf.scene;
            model.traverse(function (object) {
                object.castShadow = true;
                object.receiveShadow = true;
            });
            gameWorld.add(model);
            
            model.scale.set(4, 4, 4);
            model.position.set(-25 - (10 * i), 5, -95);
        });
    }

    for (let i = 0; i < 5; i++){
        new GLTFLoader().load('old_park_bench.glb', function (gltf) {
            const model = gltf.scene;
            model.traverse(function (object) {
                object.castShadow = true;
                object.receiveShadow = true;
            });
            model.scale.set(0.11, 0.11, 0.11);
            model.rotation.set(0, Math.PI, 0);
            gameWorld.add(model);
            
            model.position.set(-60 + (10 * i), -0.15, -33);
        });
    }

    for (let i = 0; i < 5; i++){
        new GLTFLoader().load('old_park_bench.glb', function (gltf) {
            const model = gltf.scene;
            model.traverse(function (object) {
                object.castShadow = true;
                object.receiveShadow = true;
            });
            model.scale.set(0.11, 0.11, 0.11);
            model.rotation.set(0, 0, 0);
            gameWorld.add(model);
            
            model.position.set(-60 + (10 * i), -0.15, -77);
        });
    }

    for (let i = 0; i < 4; i++){
        new GLTFLoader().load('old_park_bench.glb', function (gltf) {
            const model = gltf.scene;
            model.traverse(function (object) {
                object.castShadow = true;
                object.receiveShadow = true;
            });
            model.scale.set(0.11, 0.11, 0.11);
            model.rotation.set(0, Math.PI / 2, 0);
            gameWorld.add(model);
            
            model.position.set(-67, -0.15, -40 - (10 * i));
        });
    }
}
ground();
road();
light();
buildings();
parking();
extras();
model();
zombie();



function wrapAndRepeatTexture(map, piece) {
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.x = map.repeat.y = piece;
}
function stretchTexture(map) {
        map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
}
function vResizeAndWrapTexture(map){
        map.wrapS = THREE.ClampToEdgeWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.z = map.repeat.y = 10;
}
function hResizeAndWrapTexture(map){
        map.wrapT = THREE.ClampToEdgeWrapping;
        map.wrapS = THREE.RepeatWrapping;
        map.repeat.z = map.repeat.x = 10;
    
}

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xffffff); 
document.body.appendChild( renderer.domElement );

function handlePauseButtonClick() {
    // Set the boolean variable to true when the button is clicked
    isButtonClicked = true;
 
  }
function handlePlayButtonClick() {
    // Set the boolean variable to true when the button is clicked
    isPlayButtonClicked = true;
  }

function handleReplayButtonClick() {
    // Set the boolean variable to true when the button is clicked
    isReplayButtonClicked = true;
 
  }
  const overlayHeading = document.getElementById('overlay-heading');
// const cannonDebugger = new CannonDebugger(gameWorld, physicsWorld, {});
function animate() {

    //Change heading when Game has started
    overlayHeading.style.position = 'absolute';
    overlayHeading.style.left = '130px';
    if(overlayHeading.textContent=='Vigilante Vanguard'){
    overlayHeading.textContent = 'Level 1'; }
    //get references for each button,icon,text element
    const pauseButton = document.getElementById('pauseButton');
    const playButton = document.getElementById('otherButton');
    const pauseIcon = document.getElementById('pauseIcon');
    const replayButton = document.getElementById('quitButton');
    const separateBar = document.getElementById('separate-bar');
    const scoreElement = document.getElementById('score');
    const KillElement = document.getElementById('KillCount');
    pauseButton.addEventListener('click', handlePauseButtonClick);
    playButton.addEventListener('click', handlePlayButtonClick);
    replayButton.addEventListener('click', handleReplayButtonClick);


    physicsWorld.fixedStep();
    // cannonDebugger.update();
    const mixerUpdateDelta = clock.getDelta();
    renderer.render(gameWorld, camera);
    requestAnimationFrame(animate);
 
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);


  //if score is 2, then move to Level 2
if(scoreElement.textContent==2){
    overlayHeading.textContent = 'Level 2'; 
    KillElement.textContent = 'Mission : Kill 4 zombies';
}
  //if score is 6 then move to level 3
if(scoreElement.textContent==4){
    overlayHeading.textContent = 'Level 3'; 
    KillElement.textContent = 'Mission : Kill 6 zombies';
}
if(scoreElement.textContent==6){
    overlayHeading.textContent = 'WINNER'; 

}

//if the health bar is zero, then end the game and display "game over"
 if(parseFloat(separateBar.style.width) === 0){
    overlayHeading.style.position = 'absolute';
    overlayHeading.style.left = '90px';
    
    overlayHeading.textContent = 'GAME OVER'; 

    // characterControls=false;
    for (let zombieControl of zombies) {
        zombieControl = false;
    }

    characterControls.DeathPlay();

 }

//handles click of Replay button
 if(isReplayButtonClicked==true){

    separateBar.style.width = widdth+'px';
    scoreElement.textContent = 0;
    // isReplayButtonClicked=false;
    KillElement.textContent = 'Mission : Kill 2 zombies';
    overlayHeading.textContent = 'Level 1';  
}

//checks if the character is loaded and the pause button is not clicked, if it is clicked then this if statement won't run
  
if (characterControls && isButtonClicked==false) {
    characterControls.update(mixerUpdateDelta, keysPressed);
    bullets = characterControls.updateBullets(mixerUpdateDelta, gameWorld);
    positionX  = characterControls.getPositionX();
    positionZ = characterControls.getPositionZ();
    positionY = characterControls.getPositionY();
    for (let zombieControl of zombies) {
        characterControls.hit(zombieControl.isAttack());
    }

  }

//if the pause button is clicked then,display the pause icon
  if(isButtonClicked==true){
    pauseIcon.style.display = 'block';
  }


//if the play button is clicked, it unpauses the game
  if (characterControls && isReplayButtonClicked==true) {
    isButtonClicked=false;
    pauseIcon.style.display = 'none';
    isPlayButtonClicked=false;
    characterControls.update(mixerUpdateDelta, keysPressed);
    bullets = characterControls.updateBullets(mixerUpdateDelta, gameWorld);
    positionX  = characterControls.getPositionX();
    positionZ = characterControls.getPositionZ();
    positionY = characterControls.getPositionY();

      for (let zombieControl of zombies) {
          characterControls.hit(zombieControl.isAttack());
      }
  }

  if (characterControls && isPlayButtonClicked==true) {
    isButtonClicked=false;
    pauseIcon.style.display = 'none';
    isPlayButtonClicked=false;
    characterControls.update(mixerUpdateDelta, keysPressed);
    bullets = characterControls.updateBullets(mixerUpdateDelta, gameWorld);
    positionX  = characterControls.getPositionX();
    positionZ = characterControls.getPositionZ();
    positionY = characterControls.getPositionY();

    for (let zombieControl of zombies) {
        characterControls.hit(zombieControl.isAttack());
    }

  }

  if (zombies.length !== 0 && isButtonClicked==false){
    for (const zombieControl of zombies) {
        zombieControl.update(mixerUpdateDelta, positionX, positionZ, gameWorld);
        zombieControl.distance(new THREE.Vector3(positionX, 0, positionZ));
        zombieControl.zombieDeath();
    }
  }

    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xffffff); 

	renderer.render( gameWorld, camera );

    renderer.clearDepth();

    renderer.setScissorTest(true);

    const borderWidth = 10;  // Adjust border width as needed
    const borderOffset = 16; // Adjust border offset as needed
    
    renderer.setScissor(
        window.innerWidth - insetWidth - borderOffset,
        window.innerHeight - insetHeight - borderOffset,
        insetWidth + borderWidth,
        insetHeight + borderWidth
    );

    renderer.setViewport(
        window.innerWidth - insetWidth - borderOffset,
        window.innerHeight - insetHeight - borderOffset,
        insetWidth + borderWidth,
        insetHeight + borderWidth
    );

renderer.setClearColor(0x000000);
    renderer.render(gameWorld, cameraTop);

    renderer.setScissorTest(false);
    renderer.setClearColor(0xffffff);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  window.addEventListener('resize', onWindowResize, false);
function resize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    insetWidth = window.innerHeight / 3;
    insetHeight = window.innerHeight / 3;

    cameraTop.aspect = insetWidth / insetHeight;
    cameraTop.updateProjectionMatrix();
    
}


const startButton = document.getElementById('startButton');
startButton.addEventListener('click', () => {
  
  startButton.style.display = 'none';
 
  
  initScene();
  playShootingSound();
  displayScore();
  playOtherSound();

});
window.addEventListener("resize", resize);



// CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 15;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.update();
resize();
animate();
}



export{initScene, loadShootingSound, playShootingSound, loadOtherSound, playOtherSound};