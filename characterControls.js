import * as THREE from 'three';
import * as CANNON from "cannon-es";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { A, D, DIRECTIONS, S, W } from './utils';
import { ZombieControl } from './zombieControl';

export class CharacterControls {

    constructor(model, mixer, animationsMap, orbitControl, camera, currentAction, physicsObject, cameraTop) {
        this.physicsObject = physicsObject;
        this.cameraTop = cameraTop;
        this.firing = false;
        this.isHit = false;
        this.dead = false;
        this.fireWalk = false;
        this.death = false;
        this.isHit = false;
        this.dead = false;
        this.death = false;
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
        this.walkVelocity = 2;

        this.orbitControl = orbitControl;
        this.camera = camera;
        this.updateCameraTarget(0, 0);
        this.updateCameraTarget(0, 0);

        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play();
            }
        });
    }

    switchRunToggle() {
        this.toggleRun = !this.toggleRun;
    }

    DeathPlay() {
        this.dead = true;
        setTimeout(() => {
            this.model.visible = false;
        }, 3000);
        
    }

    DeathPlay() {
        this.dead = true;
        setTimeout(() => {
            this.model.visible = false;
        }, 3000);
    }

    isDead() {
        return this.dead;
    }
    switchToFire() {
        this.firing = true;
    }

    hit(zombieHit) {
        if (zombieHit) {
            this.isHit = true; // Play the hit animation
        }
        else {
            this.isHit = false;
        }
    }

    stopFire(){
        this.firing = false;
    }

    updateBullets(delta, scene){
        for(let i = 0; i < this.bullets.length; i++){

            if (this.bullets[i].position.x > 100 || this.bullets[i].position.x < -100){
                scene.remove(this.bullets[i]);
            }

            if (this.bullets[i].position.z > 100 || this.bullets[i].position.x < -100){
                scene.remove(this.bullets[i]);
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

    getPositionZ() {
        return this.model.position.z;
    }

    getPositionX() {
        return this.model.position.x;
    }

    getPositionY(){
        return this.model.position.y;
    }

    update(delta, keysPressed) {
        // Check if the character is disabled before updating
        if (!this.disabled) {
        const directionPressed = DIRECTIONS.some(key => keysPressed[key] === true);

        var play = '';
        if (this.dead) {
            play = 'Shot';
        }
       else if (directionPressed && this.toggleRun) {
            play = 'Run';
        } 
        else if (directionPressed) {
            if( this.firing){
                play = 'FiringWalk';
            } else {
                play = 'Walk';
            }
        } 
        else if (this.isHit){
            play = 'hit';
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

            if (current === this.animationsMap.get("Shot")){
                // Ensure the animation doesn't loop by clamping when finished
                current.clampWhenFinished = true;
                // Set the loop mode to play only once
                current.setLoop(THREE.LoopOnce);
                // Pause the animation after playing once
                current.timeScale = 0; // Set the timeScale to 0 to pause the animation
            } else {
                // For other animations, reset timeScale to 1 to play normally
                current.timeScale = 1;
            }

            current.fadeOut(this.fadeDuration);
            toPlay.reset().fadeIn(this.fadeDuration).play();
            this.currentAction = play;
        }

            this.mixer.update(delta);

            if (this.currentAction == 'Run' || this.currentAction == 'Walk' || this.currentAction == 'FiringWalk') {
            var angleYCameraDirection = Math.atan2(
                this.camera.position.x - this.model.position.x,
                this.camera.position.z - this.model.position.z,
            );

                var directionOffset = this.directionOffset(keysPressed);

                this.rotateQuarternion.setFromAxisAngle(
                    this.rotateAngle,
                    angleYCameraDirection + directionOffset
                );

                this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

            this.camera.getWorldDirection(this.walkDirection);
            // this.walkDirection.y = 0;
            this.walkDirection.normalize();
            this.walkDirection.applyAxisAngle(this.rotateAngle, directionOffset);

                const velocity = this.currentAction == 'Run' ? this.runVelocity : this.walkVelocity;

            const moveX = this.walkDirection.x * velocity * delta;
            const moveZ = this.walkDirection.z * velocity * delta;

            this.physicsObject.position.x -= moveX;
            this.physicsObject.position.z -= moveZ;
            this.model.position.x = this.physicsObject.position.x;
            this.model.position.z = this.physicsObject.position.z;
            this.model.position.y = this.physicsObject.position.y - 1;
            this.updateCameraTarget(moveX, moveZ);
                
            }
        }
    }

    updateCameraTarget(moveX, moveZ) {
    updateCameraTarget(moveX, moveZ) {
        this.camera.position.x -= moveX;
        this.camera.position.z -= moveZ;
        this.camera.position.y = this.model.position.y + 4.;

        this.cameraTop.position.z -= moveZ;
        this.cameraTop.position.x -= moveX;

        this.cameraTarget.x = this.model.position.x;
        this.cameraTarget.y = this.model.position.y + 3;
        this.cameraTarget.y = this.model.position.y + 3;
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

    shooting() {
        const geometry = new THREE.CylinderGeometry(0.01, 0.01, 0.05, 32);
        geometry.rotateX(Math.PI / 2);
        geometry.rotateY(Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({ color: 'gold' });
        const bullet = new THREE.Mesh(geometry, material);

        var angleYCameraDirection = Math.atan2(
            this.camera.position.x - this.model.position.x,
            this.camera.position.z - this.model.position.z
        );

        bullet.position.set(this.model.position.x, 2.28, this.model.position.z);
        bullet.quaternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection - (Math.PI / 2));
        this.bullets.push(bullet);
        return bullet;
    }
}
