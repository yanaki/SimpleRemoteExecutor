var express = require("express"),
    bodyParser = require("body-parser"),
    httpCodes = require("http-codes"),
    randomBytes = require("crypto").randomBytes,
    spawn = require("child_process").spawn,
    app = express(),
    tasks = new Map();

app.listen(5858, function () {
});

app.use(bodyParser.json());
app.route("/tasks/:id?")        
    .get(getTasks)
    .post(defineTask);

function getTasks(req, res) {
    var responseText = [];

    if (req.params.id) {
        res.status(httpCodes.OK).send(JSON.stringify(tasks.get(req.params.id.replace(":",""))));
    } else {
        tasks.forEach(function (value, key) {
            responseText.push(value);
        });
        res.status(httpCodes.OK).send("Current tasks\n" + JSON.stringify(responseText));
    }
}

function generateSpawnTaskResponse(task, res) {
    res.status(httpCodes.OK).send(JSON.stringify({
        taskId: task.id,
        status: task.status
    }));
}

function defineTask(req, res) {
    var task;

    if (!req.body.processName) {
        res.status(httpCodes.OK).send("Define process to run in json format {processName:'process name', arguments: 'spaces separated arguments'}");
    } else {
        task = spawnProcess(req.body.processName, req.body.arguments);
        //small delay to get the tasks that can't start
        setTimeout(generateSpawnTaskResponse.bind(undefined, task, res), 600);
    }
}

function spawnProcess(psName, params) {
    var ps,
        params = params || "",
        id = randomBytes(20).toString("hex"),
        taskDefinition = {
            id: id,
            stdout: "",
            stderr: "",
            status: "running",
            exitCode: 0
        };

    ps = spawn(psName, params.split(" "));    
    ps.stdout.on("data", function (data) {
        taskDefinition.stdout += data
    });
    ps.stdout.on("end", function (data) {
        taskDefinition.status = "finished";
    });

    ps.stderr.on("data", function (data) {
        taskDefinition.stderr += data
    });    

    ps.on("exit", function (code) {
        taskDefinition.exitCode = code;
    });
    ps.on("error", function (error) {
        taskDefinition.status = "failed_to_start";
        taskDefinition.stderr = error;
    });
  
    tasks.set(id, taskDefinition);
    
    return taskDefinition;
}