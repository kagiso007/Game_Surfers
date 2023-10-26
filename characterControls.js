import * as THREE from 'three';
import * as CANNON from "cannon-es";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { A, D, DIRECTIONS, S, W } from './utils';

export class CharacterControls {

    constructor(model, mixer, animationsMap, orbitControl, camera, currentAction, physicsObject, cameraTop) {
        this.physicsObject = physicsObject;
        this.cameraTop = cameraTop;
        this.firing = false;
        this.bullets = [];
        this.bulletSpeed = 40;

        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap;
        this.currentAction = currentAction;
        this.toggleRun = false;
        this.walkDirection = new THREE.Vector3();
        this.rotateAngle = new THREE.Vector3(0, 1, 0);
        this.rotateQuarternion = new THREE.Quaternion();
        this.cameraTarget = new THREE.Vector3();
        this.fadeDuration = 0.2;
        this.runVelocity = 5;
        this.veloY = 5;
        this.walkVelocity = 2;

        this.orbitControl = orbitControl;
        this.camera = camera;
        this.updateCameraTarget(0, 0, 0);

        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play();
            }
        });
    }

    switchRunToggle() {
        this.toggleRun = !this.toggleRun;
    }

    switchToFire(){
        this.firing = true;
    }
    stopFire(){
        this.firing = false;
    }

    updateBullets(delta, scene){
        // console.log(this.bullets.length);
        for(let i = 0; i < this.bullets.length; i++){
            // const distance = Math.sqrt(Math.pow(this.bullets[i].position.x - this.model.position.x, 2) - Math.pow(this.bullets[i].position.z - this.model.position.z, 2));

            if (this.bullets[i].position.x > 100 || this.bullets[i].position.x < -100){
                // console.log("small");
                scene.remove(this.bullets[i]);
                // this.bullets.slice(1,i);
            }
            if (this.bullets[i].position.z > 100 || this.bullets[i].position.x < -100){
                // console.log("small");
                scene.remove(this.bullets[i]);
                // this.bullets.slice(1,i);
            }

            const bulletDirection = new THREE.Vector3();
            this.model.getWorldDirection(bulletDirection);
            bulletDirection.y = 0;
            bulletDirection.normalize();
            bulletDirection.applyAxisAngle(this.rotateAngle, 0);

            const moveX = bulletDirection.x * this.bulletSpeed * delta;
            const moveZ = bulletDirection.z * this.bulletSpeed * delta;

            this.bullets[i].position.x += moveX;
            this.bullets[i].position.z += moveZ;
        }
        return this.bullets;
    }

    getPositionZ(){
        return this.model.position.z;
    }

    getPositionX(){
        return this.model.position.x;
    }


    update(delta, keysPressed) {
        const directionPressed = DIRECTIONS.some(key => keysPressed[key] === true);

        var play = '';
        if (directionPressed && this.toggleRun) {
            play = 'Run';
        } 
        else if (directionPressed) {
            play = 'Walk';
        } 
        else if (this.firing){
            play = 'Firing';
        }
        else {
            play = 'Idle';
        }

        if (this.currentAction != play) {
            const toPlay = this.animationsMap.get(play);
            const current = this.animationsMap.get(this.currentAction);

            current.fadeOut(this.fadeDuration);
            toPlay.reset().fadeIn(this.fadeDuration).play();

            this.currentAction = play;
        }

        this.mixer.update(delta);

        if (this.currentAction == 'Run' || this.currentAction == 'Walk') {
            var angleYCameraDirection = Math.atan2(
                this.camera.position.x - this.model.position.x,
                this.camera.position.z - this.model.position.z
            );
            

            var directionOffset = this.directionOffset(keysPressed);

            this.rotateQuarternion.setFromAxisAngle(
                this.rotateAngle,
                angleYCameraDirection + directionOffset
            );

            this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

            this.camera.getWorldDirection(this.walkDirection);
            this.walkDirection.y = Math.atan2(
                this.camera.position.y - this.model.position.y,
                this.camera.position.z - this.model.position.z
            );;
            this.walkDirection.normalize();
            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

            const velocity = this.currentAction == 'Run' ? this.runVelocity : this.walkVelocity;

            const moveX = this.walkDirection.x * velocity * delta;
            const moveZ = this.walkDirection.z * velocity * delta;
            // const moveY = this.walkDirection.y * velocity * delta;
            
            // let cc = this.physicsObject.position.x;
            // let ccy = this.physicsObject.position.z; 
            this.physicsObject.position.x -= moveX
            this.physicsObject.position.z -= moveZ
            this.model.position.x = this.physicsObject.position.x;
            this.model.position.z = this.physicsObject.position.z;
            this.model.position.y = this.physicsObject.position.y - 1;
        
            this.updateCameraTarget(moveX, moveZ, this.camera.position.y);
        }
    }

    updateCameraTarget(moveX, moveZ, moveY) {
        this.camera.position.x -= moveX;
        this.camera.position.z -= moveZ;
        this.camera.position.y = moveY;
        // console.log(this.camera.position.y + moveY);

        this.cameraTop.position.z -= moveZ;
        this.cameraTop.position.x -= moveX;

        this.cameraTarget.x = this.model.position.x;
        this.cameraTarget.y = this.model.position.y + 1;
        this.cameraTarget.z = this.model.position.z;
        this.orbitControl.target = this.cameraTarget;
    }

    directionOffset(keysPressed) {
        var directionOffset = 0;

        if (keysPressed[S]) {
            if (keysPressed[D]) {
                directionOffset = Math.PI / 4;
            } else if (keysPressed[A]) {
                directionOffset = - Math.PI / 4;
            }
        } else if (keysPressed[W]) {
            if (keysPressed[D]) {
                directionOffset = Math.PI / 4 + Math.PI / 2;
            } else if (keysPressed[A]) {
                directionOffset = -Math.PI / 4 - Math.PI / 2;
            } else {
                directionOffset = Math.PI;
            }
        } else if (keysPressed[D]) {
            directionOffset = Math.PI / 2;
        } else if (keysPressed[A]) {
            directionOffset = -Math.PI / 2;
        }

        return directionOffset;
    }

    shooting(){
        const geometry = new THREE.CylinderGeometry(0.01, 0.01, 0.05, 32);
        geometry.rotateX(Math.PI / 2);
        geometry.rotateY(Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({color: 'gold'});
        const bullet = new THREE.Mesh(geometry, material);

        var angleYCameraDirection = Math.atan2(
            this.camera.position.x - this.model.position.x,
            this.camera.position.z - this.model.position.z
        );

        bullet.position.set(this.model.position.x, 2.28 , this.model.position.z);
        bullet.quaternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection - (Math.PI / 2));
        this.bullets.push(bullet);
        return bullet;
    }
}
