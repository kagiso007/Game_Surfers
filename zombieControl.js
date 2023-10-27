import * as THREE from 'three';
let score = 0;
let width = 185;
let isReplayButtonClicked = false;
// import { CharacterControls } from './characterControls';

export class ZombieControl {

    constructor(model, mixer, animationsMap, currentAction, physicsObject, bullets) {
        this.physicsObject = physicsObject;
        this.death = false;
        this.attack = false;
        this.toggleRun = false;
        this.died = false;
        this.bullets = bullets;
        // this.hit = false;

        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap;
        this.currentAction = currentAction;
        this.walkDirection = new THREE.Vector3();
        this.rotateAngle = new THREE.Vector3(0, 1, 0);
        this.rotateQuarternion = new THREE.Quaternion();
        this.fadeDuration = 0.2;
        this.runVelocity = 15;
        this.walkVelocity = 0.5;

        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play();
            }
        });
    }
    distance(position){
        const seperateBar = document.getElementById('separate-bar');
        const currentPosition = this.model.position.clone();
        const distance = currentPosition.distanceTo(position);

        if (distance < 2) {
            this.attack = true;
            width -= 1;
            seperateBar.style.width = width + 'px';
            this.toggleRun = false;
        }
        else if (distance < 50){
            this.toggleRun = true;
        }
        else{
            this.attack = false;
            this.toggleRun = false;
        }
        
    }

   
    zombieDeath(gameWorld, index, zombies){
        //reference the score
        const scoreElement = document.getElementById('score');
        for(let i = 0; i < this.bullets.length; i++){
            const currentPosition = this.model.position.clone();
            const position = this.bullets[i].position.clone();
            const distance = currentPosition.distanceTo(position);
            if(this.death || this.died){
                this.died = true;
                this.death = false;
                this.attack = false;
                this.toggleRun = false;
                setTimeout(() => {
                    this.model.visible = false;
                    gameWorld.remove(this.model);
                    // zombies.splice(index, 1);
                    this.model.traverse(child => {
                        if (child.isMesh) {
                            child.geometry.dispose();
                            child.material.dispose();
                        }
                    });
                }, 5000);
            }
            else if (distance < 5){
                this.attack = false;
                this.toggleRun = false;
                this.death = true;
            }
        }
    }

    update(delta, userPositionX, userPositionZ) {

        var play = '';
        if (this.toggleRun) {
            play = 'Zombie_Run';
        } 
        else if (this.death) {
            play = 'Zombie_Death';
        } 
        else if (this.died) {
            play = 'Zombie_Died';
        } 
        else if (this.attack){
            play = 'Zombie_Attack_Armature';
        }
        else {
            play = 'Zombie_Walk';
        }

        if (this.currentAction != play) {
            const toPlay = this.animationsMap.get(play);
            const current = this.animationsMap.get(this.currentAction);

            current.fadeOut(this.fadeDuration);
            toPlay.reset().fadeIn(this.fadeDuration).play();

            this.currentAction = play;
        }

        this.mixer.update(delta);

        if (this.currentAction == 'Zombie_Run' || this.currentAction == 'Zombie_Walk') {
            var angleYCameraDirection = Math.atan2(
                userPositionX - this.model.position.x,
                userPositionZ - this.model.position.z
            );

            this.rotateQuarternion.setFromAxisAngle(
                this.rotateAngle,
                angleYCameraDirection
            );

            this.model.quaternion.rotateTowards(this.rotateQuarternion, 0.2);

            this.model.getWorldDirection(this.walkDirection);
            this.walkDirection.y = 0;
            this.walkDirection.normalize();
            this.walkDirection.applyAxisAngle(this.rotateAngle, 0);

            const velocity = this.currentAction == 'Zombie_Run' ? this.runVelocity : this.walkVelocity;

            const moveX = this.walkDirection.x * velocity * delta;
            const moveZ = this.walkDirection.z * velocity * delta;
        
            this.physicsObject.position.x += moveX
            this.physicsObject.position.z += moveZ
            this.model.position.x = this.physicsObject.position.x;
            this.model.position.z = this.physicsObject.position.z;
        }
    }
}
