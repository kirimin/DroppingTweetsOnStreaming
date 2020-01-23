(function () {

    function getRandomInt(min, max) {
        return Math.floor(min + Math.random() * Math.floor(max - min));
    }

    let bodyArray = [];
    function addListAndremoveOld(world, body){
        bodyArray.push(body);
        if (bodyArray.length >= 20) {
            Matter.World.remove(world, bodyArray[0]);
            bodyArray.shift();
        }
    }

    function createEngine(parentNode) {
        const Engine = Matter.Engine;
        const World = Matter.World;
        const Bodies = Matter.Bodies;
        const MouseConstraint = Matter.MouseConstraint;

        let engine = Engine.create(parentNode, {
            render: {
                options: {
                    wireframes: false,
                    background: 'green',
                    height: 1000,
                    width: 1980,
                }
            }
        });

        // Create ground
        let ground = Bodies.rectangle(1000, 1000, 1980, 60, { isStatic: true });
        World.add(engine.world, [ground]);

        let mouseConstraint = MouseConstraint.create(engine);
        World.add(engine.world, mouseConstraint);

        Engine.run(engine);
        return engine;
    }

    function createTexture(sourceCanvas, bounds) {
        let canvas = document.createElement('canvas');
        canvas.width = bounds.max.x - bounds.min.x + 1;
        canvas.height = bounds.max.y - bounds.min.y + 1;

        canvas.getContext('2d').drawImage(sourceCanvas, bounds.min.x, bounds.min.y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL();
    }

    function alphaToWhite(data8U) {
        for (let i = 0; i < data8U.length; i += 4) {
            if (data8U[i + 3] == 0) {
                data8U[i] = 255;
                data8U[i + 1] = 255;
                data8U[i + 2] = 255;
                data8U[i + 3] = 255;
            }
        }
    }

    function createWordInfo(word) {
        let canvas = document.createElement('canvas');
        canvas.width = 80 * word.length;
        canvas.height = 100;
        let context = canvas.getContext('2d');

        // draw text
        context.fillStyle = 'black';
        context.font = '80px sans-serif';
        context.fillText(word, 10, 90);

        let source = cv.imread(canvas);
        alphaToWhite(source.data);
        let destC1 = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC1);
        let destC4 = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);

        cv.cvtColor(source, destC1, cv.COLOR_RGBA2GRAY);
        cv.threshold(destC1, destC4, 254, 255, cv.THRESH_BINARY);
        cv.bitwise_not(destC4, destC4);

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(destC4, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE, { x: 0, y: 0});
        hierarchy.delete();
        destC1.delete();
        destC4.delete();
        source.delete();

        let points = [];
        for (let i = 0; i < contours.size(); i++) {
            let d = contours.get(i).data32S;
            for (let j = 0; j < d.length; j++) {
                points.push(d[j]);
            }
        }
        contours.delete();

        if (points.length < 3) {
            return null;
        }

        let _points = new cv.Mat(1, points.length / 2, cv.CV_32SC2);
        let d = _points.data32S;
        for (let i = 0; i < points.length; i++) {
            d[i] = points[i];
        }
        let hull = new cv.Mat();
        cv.convexHull(_points, hull);
        _points.delete();

        let vert = [];
        d = hull.data32S;
        for (let i = 0; i < d.length; i += 2) {
            vert.push({ x: d[i], y: d[i + 1]});
        }
        hull.delete();

        const bounds = Matter.Bounds.create(vert);
        const texture = createTexture(canvas, bounds);

        return {
            vert: vert,
            texture: texture
        };
    }

    function addToWorld(engine, word, x) {
        createWordInfo(word);

        const info = createWordInfo(word);
        if (info == null) {
            console.warn('Can not add "' + word  + '" to world');
            return;
        }

        let wordBody = Matter.Bodies.fromVertices(x, 0, info.vert, {
            render: {
                sprite: {
                    texture: info.texture
                }
            }
        });

        Matter.World.add(engine.world, wordBody);
        addListAndremoveOld(engine.world, wordBody);
    }

    let engine = createEngine(document.getElementById('world'));
    let maxId = "0000000"
    setInterval(function() {
        fetch('https://us-central1-droppingtweetsonstreaming.cloudfunctions.net/searchTweets', {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({ "data" : { 
                    "text": `#%E3%81%8D%E3%82%8A%E3%81%BF%E3%82%93%E3%81%A1%E3%82%83%E3%82%93%E3%81%AD%E3%82%8B -RT -https since_id:${maxId}"`,
                    "bearer": `${token.bearer_token}`
                }
            })
        })
        .then(res=>res.json())
        .then(function(response) {
            maxId = response.result.max_id.toString()
            maxId = maxId.substring(0, 14) + (parseInt(maxId.substr(14)) + 1).toString()
            console.log(response.result)
            response.result.tweets.forEach(element => {
                setTimeout(
                    function () {
                        addToWorld(engine, element, getRandomInt(800, 1400));
                        addToWorld(engine, '💮', getRandomInt(0, 1980));
                        addToWorld(engine, '🍣', getRandomInt(0, 1980));
                        addToWorld(engine, '📛', getRandomInt(0, 1980));
                    },
                    3000
                );
            });
        }).catch(error => console.error('Error:', error));
    }, 20000);
})();