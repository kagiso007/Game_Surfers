import * as THREE from 'three';
let score = 0;
let width = 185;

export class ZombieControl {
 
    constructor(model, mixer, animationsMap, currentAction, physicsObject, bullets) {
        this.physicsObject = physicsObject;
        this.death = false;
        this.attack = false;
        this.toggleRun = false;
        this.died = false;
        this.bullets = bullets;
        
        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap;
        this.currentAction = currentAction;
        this.walkDirection = new THREE.Vector3();
        this.rotateAngle = new THREE.Vector3(0, 1, 0);
        this.rotateQuarternion = new THREE.Quaternion();
        this.fadeDuration = 0.5;
        this.runVelocity = 15;
        this.walkVelocity = 1;

        this.animationsMap.forEach((value, key) => {
            if (key == currentAction) {
                value.play();
            }
        });
    }
  
      
    distance(position){
        //reference the health bar
        const separateBar = document.getElementById('separate-bar');
      
        const currentPosition = this.model.position.clone();
        const distance = currentPosition.distanceTo(position);

        if (distance < 2) {

            this.attack = true;
            //decrease the width of the health bar by 1 when the zombie is within range
            if(this.died){
                width -= 0;
                separateBar.style.width = width + 'px';
            }
            else{
                width -= 1;
                separateBar.style.width = width + 'px';
            }
            
            separateBar.style.width = width + 'px';
            this.toggleRun = false;
           
        }
        // else if (distance < 50){
        //     this.toggleRun = true;
        // }
        else{
            this.attack = false;
            this.toggleRun = false;
        }
        
    }
   
    zombieDeath(){
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
            }
            else if (distance < 5){
                this.attack = false;
                this.toggleRun = false;
                this.death = true;
                //if the zombie is killed then the score increments by 1
                score += 1;
                scoreElement.textContent = score;
            }
        }
    }
   
      update(delta, userPositionX, userPositionZ, gameWorld) {
        var play = '';
        if (this.toggleRun) {
            play = 'Running';
        } 
        else if (this.death) {
            play = 'Dying';
        } 
        else if (this.died) {
            play = 'Died';
        } 
        else if (this.attack){
            play = 'Attack';
        }
        else {
            play = 'Walking';
        }

        if (this.currentAction != play) {
            const toPlay = this.animationsMap.get(play);
            const current = this.animationsMap.get(this.currentAction);

            if(current === this.animationsMap.get("Dying")){
                current.setLoop(THREE.LoopOnce);
            }
            current.crossFadeTo(toPlay, this.fadeDuration);
            current.fadeOut(this.fadeDuration);
            toPlay.reset().fadeIn(this.fadeDuration).play();

            this.currentAction = play;
        }

        this.mixer.update(delta);
        
        if (this.currentAction == 'Running' || this.currentAction == 'Walking') {
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
            
            // let cc = this.physicsObject.position.x;
            // let ccy = this.physicsObject.position.z; 
            this.physicsObject.position.x += moveX
            this.physicsObject.position.z += moveZ
            this.model.position.x = this.physicsObject.position.x;
            this.model.position.z = this.physicsObject.position.z;
        }
    }
  
}
