let canvas  = document.getElementById("boids");
let context = canvas.getContext("2d");

function Vector(x, y) {
    this.x = x;
    this.y = y;

    this.add = function(vect) {
        this.x += vect.x;
        this.y += vect.y;
    }

    this.sub = function(vect) {
        this.x -= vect.x;
        this.y -= vect.y;
    }

    this.mag = function() {
        return Math.sqrt(this.x**2 + this.y**2)
    }

    this.mult = function(factor) {
        this.x *= factor;
        this.y *= factor;
    }

    this.norm = function() {
        if (this.mag() > 0) {
            let s = 1/this.mag();
            this.mult(s);
        }
    }

    this.limit = function(min, max) {
        let mag = this.mag();

        if (mag > max) {
            this.mult(max/mag);
        }
        if (mag < min) {
            this.mult(min/mag);
        }
    }
}

function Boid(x, y) {
    this.position       = new Vector(x, y);
    this.velocity       = new Vector(5*Math.random(), 5*Math.random());
    this.acceleration   = new Vector(0, 0);

    this.max_acceleration   = 0.05;
    this.max_velocity       = 3.0;
    this.min_velocity       = 1.0;
    this.size   = 8.0;
    this.sight  = new Vector(80, 4*Math.PI/5);

    this.target_separation      = 25;
    this.target_cohesion        = 50;
    this.separation_strength    = 2.5;
    this.cohesion_strength      = 1.0;
    this.alignment_strength     = 1.5;

    this.relative = function(x, y) {
        if (this.velocity.mag() > 0) {
            var head = new Vector(this.velocity.x, this.velocity.y);
        } else {
            var head = new Vector(2*(Math.random() - 0.5), 2*(Math.random() - 0.5));
        }

        let rel_y = new Vector( head.x, head.y);
        let rel_x = new Vector(-head.y, head.x);
        

        rel_x.norm();
        rel_y.norm();
        rel_x.mult(x);
        rel_y.mult(y);

        let new_vector = new Vector(0, 0);
        
        new_vector.add(this.position);
        new_vector.add(rel_x);
        new_vector.add(rel_y);
        return new Vector(new_vector.x, new_vector.y);
    }

    this.bearing = function(vect) {
        let head = new Vector(this.velocity.x, this.velocity.y);
        head.norm();

        let bear = new Vector(0, 0);
        bear.add(vect);
        bear.norm();

        let angle = Math.acos(bear.x*head.x + bear.y*head.y);
        return ((angle < this.sight.y) || (angle > (2*Math.PI - this.sight.y)));
    }

    this.draw = function() {
        let vert1 = this.relative( 0.00,            1.00*this.size);
        let vert2 = this.relative( 0.66*this.size, -0.75*this.size);
        let vert3 = this.relative(-0.66*this.size, -0.75*this.size);

        context.beginPath();
        context.moveTo(vert1.x, vert1.y);
        context.lineTo(vert2.x, vert2.y);
        context.lineTo(vert3.x, vert3.y);
        context.lineTo(vert1.x, vert1.y);

        context.fillStyle = "lightblue";
        context.fill();
    }

    this.update = function() {
        this.acceleration.limit(0, this.max_acceleration);
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.min_velocity, this.max_velocity);
        this.position.add(this.velocity);

        this.acceleration.mult(0);
    }

    this.flock = function(boids) {
        let force = new Vector(0, 0);

        let separation  = new Vector(0, 0);
        let cohesion    = new Vector(0, 0);
        let alignment   = new Vector(0, 0);

        for (let i = 0; i < boids.length; i++) {
            let vect = new Vector(0, 0);
            vect.add(boids[i].position);
            vect.sub(this.position);

            let dist = vect.mag();

            if ((dist < this.sight.x) && (this.bearing(vect))) {
                vect.norm();

                if (dist < this.target_separation) {
                    separation.add(vect);
                }

                if (dist > this.target_cohesion) {
                    cohesion.add(vect);
                }            
            }

            let head = new Vector(0, 0);
            head.add(boids[i].velocity);
            head.norm()
            alignment.add(head);
        }

        separation.norm();
        cohesion.norm();
        alignment.norm()

        separation.mult(this.separation_strength);
        cohesion.mult(this.cohesion_strength);
        alignment.mult(this.alignment_strength);

        let steer = new Vector(0, 0);
        steer.sub(separation);
        steer.add(cohesion);
        steer.add(alignment);
        steer.norm();
        steer.mult(this.max_velocity);
        if (steer.mag() > 0) {
            steer.sub(this.velocity);
        }
        
        this.acceleration.add(steer);
    }

    this.border = function() {
        let force = new Vector(0, 0);
        if (this.position.x < this.sight.x) {
            force.x = 1;
        }
        else if (this.position.x > canvas.width - this.sight.x) {
            force.x = -1;
        }
        else if (this.position.y < this.sight.x) {
            force.y = 1;
        }
        else if (this.position.y > canvas.height - this.sight.x) {
            force.y = -1;
        }
        else {
            return;
        }

        force.norm();
        force.mult(this.max_velocity);
        force.sub(this.velocity);
        force.mult(1);
        this.acceleration.add(force);        
    }

    this.wraparound = function() {
        if (this.position.x < -this.size) {
            this.position.x = canvas.width + this.size;
        }
        if (this.position.x > canvas.width + this.size) {
            this.position.x = -this.size;
        }
        if (this.position.y < -this.size) {
            this.position.y = canvas.height + this.size;
        }
        if (this.position.y > canvas.height + this.size) {
            this.position.y = -this.size;
        }
    }

}



function main() {
    let boids = [];

    for (let i = 0; i < 150; i++) {
        let boid = new Boid(Math.random()*canvas.width, Math.random()*canvas.height);
        //let boid = new Boid(canvas.width/2, canvas.height/2);
        boids.push(boid);
    }
    
    setInterval(() => {
        context.fillStyle = "black";
        context.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 150; i++) {
            boids[i].draw();
            boids[i].flock(boids);
            //boids[i].border();
            
            boids[i].update();
            boids[i].wraparound();
        }
    }, 20);
}

main();
console.log(Math.acos(-1));