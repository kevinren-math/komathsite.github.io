function stringWithFormatAndArgs(format, array, startIndex) {
    var part = format.split("@@"), count = part.length - 1, index = startIndex;
    var first = part.shift(), newStr = first;
    var len = part.length, a;
    for (a = 0; a < len; a++) newStr += array[index++] + part[a];
    return [count, newStr];
}

function randBet(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
}

var priorities = ["^", "*/", "+-", "%"]
var numToChar = {94:'^', 42:'*', 47:'/', 43:'+', 45:'-', 37:'%'}

function calculate(type, left, right) {
    if (type === '+') {
        return left + right;
    } else if (type === '-') {
        return left - right;
    } else if (type === '*') {
        return left * right;
    } else if (type === '/') {
        return left / right;
    } else if (type === '^') {
        return Math.pow(left, right);
    } else if (type === '%') {
        return left % right;
    } else
        return 0;
}

function Operation(array) {
    this.evaluate = function evaluate(varDict) {
        var parse = this;
        var newOp = {};
        var newParse = newOp;
        while (true) {
            if (typeof parse.left === "string") newParse.left = varDict[parse.left];
            else if (typeof parse.left === "object") newParse.left = parse.left.evaluate(varDict);
            else newParse.left = parse.left;
            newParse.type = parse.type;
            newParse.right = {};
            newParse = newParse.right;
            if (!parse.type) break;
            parse = parse.right;
            if (!parse) break;
        }
        // Now evaluate based on precedence;
        newParse = newOp;
        var i;
        for (i = 0; i < 4; i++) {
            type = newParse.type;
            while (type) {
                if (priorities[i].includes(type)) {
                    next = newParse.right;
                    result = calculate(type, newParse.left, next.left);
                    newParse.left = result;
                    newParse.type = next.type;
                    newParse.right = next.right;
                } else
                    newParse = newParse.right;
                
                type = newParse.type;
            }
           	newParse = newOp;
        }
        return newOp.left;
    }
    
    var op = this;
    var s = array[0];
    if (s.length > 1) op.left = new Operation(s);
    else op.left = s[0];
    var current = op;
    var len = array.length, i;
    for (i = 1; i < len - 1; i += 2) {
        current.type = numToChar[array[i]];
        current.right = {evaluate:this.evaluate};
        current = current.right;
        s = array[i+1];
        if (s.length > 1) current.left = new Operation(s);
        else current.left = s[0];
    }
    current.type = "";
}


function Expression(array) {
    this.evaluate = function evaluate(varDict) {
        if (typeof this.value === "string") return varDict[this.value];
       	else if (typeof this.value === "object") return this.value.evaluate(varDict);
       	else return this.value;
    }
    if (array.length > 1) {
        this.value = new Operation(array);
        return;
    }
    this.value = array[0];
}

function expressionListFromArray(exp) {
    var x = [], i, len;
    for (i = 0, len = exp.length; i < len; i++) x.push(new Expression(exp[i]))
        return x;
}

function Comparison(array) {
    this.type = array[0];
    this.leftExp = new Expression(array[1]);
    this.rightExp = new Expression(array[2])
    this.evaluate = function evaluate(varDict) {
        left = this.leftExp.evaluate(varDict);
        right = this.rightExp.evaluate(varDict);
        if (this.type === 0) {
            return left === right;
        } else if (this.type === 2) {
            return left <= right;
        } else if (this.type === 1) {
            return left >= right;
        } else if (this.type === 5) {
            return left != right;
        } else if (this.type === 3) {
            return left > right;
        } else if (this.type === 4) {
            return left < right;
        } else
            return true;
    }
}

function PModule(module, array) {
    this.inst = module.inst;
    this.args = module.args;
    this.varList = {};
    var i, len, p, prob;
    for (i = 0, len = module.argList.length; i < len; i++) this.varList[module.argList[i]] = array[i];
    
    this.prob = module.prob;
    this.soln = module.soln;
    this.problem = function problem() {
        for (i in this.inst) this.inst[i].execute(this.varList);
        var array = [];
        for (i = 0, len = this.args.length; i < len; i++) array.push(this.args[i].evaluate(this.varList))
            prob = stringWithFormatAndArgs(this.prob, array, 0);
        count = prob[0];
        p = prob[1];
        return [p, stringWithFormatAndArgs(this.soln, array, count)[1]];
    }
}

function PProgram(p, args, modules) {
    this.modCount = p.modCount;
    this.modRef = p.modRef;
    this.modArgs = p.modArgs;
    var i, varDict = {}, len;
    for (i = 0, len = p.argList.length; i < len; i++) varDict[p.argList[i]] = args[i];
    
    this.start = 0;
    this.end = 0;
    
    var mArray = [];
    
    len = this.modCount.length;
    for (i = 0; i < len; i++) {
        var finalModArgs = [], j, l;
        for (j = 0, l = this.modArgs[i].length; j < l; j++) finalModArgs.push(this.modArgs[i][j].evaluate(varDict));
        mod = new PModule(modules[this.modRef[i]], finalModArgs);
        for (j = 0, l = this.modCount[i].evaluate(varDict); j < l; j++) mArray.push(mod);
    }
    this.modArray = mArray;
    this.shuffleArray = function shuffleArray() {
        this.modArray.sort(function(a, b){return 0.5 - Math.random()});
    }
    
    this.shuffleArray();
    
    this.queueProblems = function queueProblems(probCount) {
        if (probCount > 0) {
            this.end += probCount;
            if (this.end > this.modArray.length) this.end = this.modArray.length;
        } else // default queue everything;
            this.end = this.modArray.length;
    }
    
    this.reset = function reset() {
        this.shuffleArray();
        this.start = 0;
        this.end = 0;
    }
    this.nextProblem = function nextProblem(offset) {
        if (this.start < this.end) {
            var p = this.modArray[this.start].problem();
            this.start += 1;
            return [(this.start + offset) + ". " + p[0], p[1]];
        } else
            return null;
    }
    this.problemsNotQueued = function problemsNotQueued() {
        return this.modArray.length - this.end;
    }
    
}

function instructionFromArray(array) {
    var c = array[0][0];
    if (c === 'R') { return new RandInt(array);
    } else if (c ==='L') { return new ItemFromList(array);
    } else if (c === 'C') { return new Evaluate(array);
    } else if (c === 'I') { return new Conditional(array);
    } else if (c === 'F') { return new ForClause(array);
    } else if (c === 'W') { return new WhileClause(array);
    } else if (c ==='S') { return new FormatString(array);
    } else if (c === 'M') { return new Subroutine(array);
    } else if (c === 'D') { return new Direction(array);
    } else if (c === 'P') { return new ProgramRef(array);
    } else return null;
}

function instructionListFromArray(inst) {
    var x = [], i, len;
    for (i = 0, len = inst.length; i < len; i++) x.push(instructionFromArray(inst[i]));
    return x;
}

function RandInt(array) {
    this.var = array[1];
    this.lower = new Expression(array[2]);
    this.higher = new Expression(array[3]);
    
    this.execute = function execute(varDict) {
        varDict[this.var] = randBet(this.lower.evaluate(varDict), this.higher.evaluate(varDict));
    }
}

function ItemFromList(array) {
    this.var = array[1];
    this.identifier = new Expression(array[2]);
    this.list = array[3]
    
    this.execute = function execute(varDict) {
        var index = this.identifier.evaluate(varDict);
        if (0 <= index && index < this.list.length) varDict[this.var] = (this.list)[index]
            }
}
function Evaluate(array) {
    this.var = array[1];
    this.op = new Operation(array[2])
    
    this.execute = function execute(varDict) {
        varDict[this.var] = this.op.evaluate(varDict)
    }
}

function Conditional(array) {
    this.execute = function execute(varDict) {
        if (this.comp.evaluate(varDict))
            for (obj in this.instructions) this.instructions[obj].execute(varDict);
        else if (this.next) this.next.execute(varDict);
    }
    var cond = this;
    var length = array.length;
    var i;
    cond.comp = new Comparison(array[1]);
    cond.instructions = instructionListFromArray(array[2]);
    for (i = 3; i < length - 1; i += 2) {
        cond.next = {execute:this.execute};
        cond = cond.next;
        cond.comp = new Comparison(array[i]);
        cond.instructions = instructionListFromArray(array[i+1]);
    }
    cond.next = null;
}

function ForClause(array) {
    this.var = array[1];
    this.value = new Expression(array[2]);
    this.comp = Comparison(array[3]);
    this.step = new Expression(array[4]);
    this.instructions = instructionListFromArray(array[5])
    
    this.execute = function execute(varDict) {
        var i = this.value.evaluate(varDict);
        varDict[this.var] = i;
        while (this.comp.evaluate(varDict))
            for (obj in this.instructions) {
                obj.execute(varDict);
                i += this.step.evaluate(varDict);
                varDict[this.var] = i
            }
    }
}

function WhileClause(array) {
    this.comp = new Comparison(array[1]);
    this.instructions = instructionListFromArray(array[2])
    
    this.execute = function execute(varDict) {
        while (this.comp.evaluate(varDict))
            for (obj in this.instructions) { this.instructions[obj].execute(varDict) }
    }
}

function FormatString(array) {
    this.var = array[1];
    this.args = expressionListFromArray(array[2]);
    this.format = array[3]
    
    this.execute = function execute(varDict) {
        var x = [], i;
        for (i = 0, len = this.args.length; i < len; i++) x.push(this.args[i].evaluate(varDict));
        varDict[this.var] = stringWithFormatAndArgs(this.format, x, 0)[1];
    }
}

function Subroutine(array) {
    this.var = array[1];
    this.argsId = [];
    var args = [];
    var key;
    for (key in array[2]) {
        this.argsId.push(key);
        args.push(array[2][key]);
    }
    this.args = expressionListFromArray(args);
    this.inst = instructionListFromArray(array[3]);
    this.returnExp = new Expression(array[4]);
    
    this.execute = function execute(varDict) {
        var i, len;
        
        var varList = {};
        for (i = 0, len = this.argsId.length; i < len; i++) varList[this.argsId[i]] = this.args[i].evaluate(varDict);
        
        for (i in this.inst) this.inst[i].execute(varList);
        varDict[this.var] = this.returnExp.evaluate(varList);
    }
}

function Direction(array) {
    this.args = expressionListFromArray(array[1]);
    this.format = array[2];
    
    this.execute = function execute(varDict) {
        var array = [], i, len;
        for (i = 0, len = this.args.length; i < len; i++) array.push(this.args[i].evaluate(varDict));
        
        finalStr = stringWithFormatAndArgs(this.format, array, 0)[1];
        formatArray = varDict["__dir"];
        setNum = varDict["setNum"] - 1;
        if (formatArray[setNum].length === 0)
            formatArray[setNum] = finalStr;
        else
            formatArray[setNum] += "\n" + finalStr
            }
}

function ProgramRef(array) {
    var varDict = array[1];
    if ('v' in varDict) this.var = varDict['v'];
    else this.var = "";
    if ('c' in varDict) this.probCount = varDict['c'];
    else this.probCount = null;
    
    this.execute = function execute(varDict) {
        varDict["setNum"] += 1;
        varDict["__dir"].push("");
        var probNum = varDict["probNum"];
        
        var program;
        
        if (this.ref === -1)
            program = varDict[this.var];
        else {
            var args = [], i;
            for (i = 0, len < this.args; i < len; i++) args.push(this.args[i].evaluate(varDict));
            program = new PProgram(varDict["__proLST"][this.ref], args, varDict["__modLST"]);
        }
        if (this.probCount) {
            probCount = this.probCount.evaluate(varDict);
            probLeft = program.problemsNotQueued();
            if (probCount <= 0 || probCount > probLeft) probCount = probLeft;
        } else
            probCount = program.problemsNotQueued();
        varDict["__pro"].push(program);
        varDict["__probCnt"].push(probCount);
        varDict["probNum"] = probNum + probCount
    }
    
    if (array.length === 2) {
        this.ref = -1;
        return;
    }
    
    this.ref = array[2];
    this.args = [];
    var i, len;
    for (i = 0, len = array[3].length; i < len; i++) this.args.push(new Expression(array[3][i]));
}

function Module(array) {
    this.argList = array[0];
    this.inst = instructionListFromArray(array[1]);
    this.args = expressionListFromArray(array[2]);
    this.prob = array[3];
    this.soln = array[4];
}

function Program(array) {
    this.argList = array[0];
    this.modCount = expressionListFromArray(array[1]);
    this.modRef = array[2];
    var i, len;
    this.modArgs = [];
    for (i = 0, len = array[3].length; i < len; i++) this.modArgs.push(expressionListFromArray(array[3][i]));
    
}

function ProblemSetFromFile(file) {
    f = open(file, 'r');
    x = json.load(f);
    f.close();
    return new ProblemSet(x);
}

function ProblemSet(array) {
    this.passedArgs = array[0];
    this.inst = instructionListFromArray(array[1]);
    var i = 0, len;
    this.modules = []; this.programs = [];
    for (i = 0, len = array[2].length; i < len; i++) this.modules.push(new Module(array[2][i]));
    for (i = 0, len = array[3].length; i < len; i++) this.programs.push(new Program(array[3][i]));
    
    this.loadSetWithArgs = function loadSetWithArgs(args) {
        if (this.passedArgs.length > args.length)
            return;
        
        var varDict = {};
        for (i = 0, len = this.passedArgs.length; i < len; i++) varDict[this.passedArgs[i]] = args[i];
        // Global variables) {
        varDict["probNum"] = 1;
        varDict["setNum"] = 1;
        // Instructions;
        varDict["__dir"] = [""];
        varDict["__pro"] = [];
        varDict["__probCnt"] = [];
        varDict["__proLST"] = this.programs;
        varDict["__modLST"] = this.modules;
        for (ex in this.inst) {
            if (this.inst[ex]) this.inst[ex].execute(varDict);
            else return null;
        }
        
        this.curPrograms = varDict["__pro"];
        this.curFormat = varDict["__dir"];
        this.probCount = varDict["__probCnt"];
        this.setNum = 0;
        this.offset = 0;
        this.curPrograms[0].queueProblems(this.probCount[0]);
        this.loadNextProblem();
        return varDict;
    }
    // define PS_NEWSET 0;
    // define PS_NOTLOAD 1;
    // define PS_END 2;
    // define PS_SUCCESS 3
    
    this.loadWithArgs = function loadWithArgs(args) {
        x = this.loadSetWithArgs(args);
        return x != null;
    }
    this.loadNextProblem = function loadNextProblem() {
        if (!this.curPrograms) return 1;
        prob = this.curPrograms[this.setNum].nextProblem(this.offset);
        if (!prob) { // Moving on to next set
            this.setNum++;
            if (this.setNum >= this.curPrograms.length) // We are done with all programs
                return this.doneWithSet();
            
            this.offset += probCount[this.setNum-1];
            this.curPrograms[this.setNum].queueProblems(this.probCount[this.setNum]);
            this.currentProblem = this.curPrograms[this.setNum].nextProblem(offset);
            return 0;
        }
        this.currentProblem = prob;
        return 3;
    }
    
    this.doneWithSet = function doneWithSet() {
        return 2;
    }
}

function DGProblemSet(array) {
    var set = new ProblemSet(array);
    set.loadWithArgs = function loadWithArgs(args) {
        x = this.loadSetWithArgs(args);
        if (!x) return False;
        this.name = x["name"];
        this.timeLimit = x["time"];
        this.correct = 0;
        this.total = 0;
        this.correctMult = x["correct"];
        this.incorrectMult = x["incorrect"];
        this.instructions = this.name + " Directions: " + this.curFormat[0];
        return true;
    }
    set.reset = function reset() {
        if (!this.curPrograms) return;
        for (p in this.curPrograms) this.curPrograms[p].reset();
        this.curPrograms[0].queueProblems(probCount[0]);
        this.correct = 0;
        this.total = 0;
        this.setNum = 0;
        this.offset = 0;
        this.loadNextProblem();
    }
    
    set.registerResponseForCurrentProblem = function registerResponseForCurrentProblem(res) {
        this.total++;
        p = this.currentProblem
        if (p[1].split(" ").join() == res.split(" ").join("")) {
            this.correct++;
            returnText = "Correct!";
        } else {
            returnText = p[0] + " Your answer: " + res + " Correct answer: " + p[1] + "\n";
        }
        this.loadNextProblem();
        return returnText;
    }
    
    set.doneWithSet = function doneWithSet() {
        this.offset += this.probCount[this.setNum-1];
        this.setNum = 0;
        for (p in this.curPrograms) this.curPrograms[p].reset();
        this.curPrograms[0].queueProblems(this.probCount[0]);
        this.currentProblem = this.curPrograms[setNum].nextProblem(this.offset);
        return 0;
    }
    
    set.score = function score() {
        var SPECIAL_NUM = 100;
        var incorrect = this.total - this.correct;
        var baseScore = this.correct * this.correctMult - incorrect * this.incorrectMult;
        var mult = randBet(SPECIAL_NUM - incorrect, SPECIAL_NUM + this.correct) / SPECIAL_NUM;
        if (mult < 1 && randBet(1, SPECIAL_NUM) <= incorrect) mult = 0;
        return [baseScore, mult]
    }
    return set;
}

function submit() {
    var button = document.getElementById("submit");
    if (button.innerHTML === "Start") {
        button.innerHTML = "Submit";
        setTimer(problemSet.timeLimit);
    } else {
        console.log(problemSet.registerResponseForCurrentProblem(document.getElementById("res").value));
    }
    updateProblemField(problemSet.currentProblem[0]);
    document.getElementById("res").value = "";
}

function updateProblemField(text) {
    document.getElementById("problem").innerHTML = text;
    MathJax.Hub.Queue(["Typeset",MathJax.Hub,"problem"]);
}

function loadSet(url) {
    var xmlhttp = new XMLHttpRequest();
    
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 /* && xmlhttp.status == 200*/ ) {
            var myArr = JSON.parse(xmlhttp.responseText);
            problemSet = DGProblemSet(myArr);
            problemSet.loadWithArgs([10]);
            if (theStartTime) updateProblemField(problemSet.instructions);
            else document.getElementById("problem").innerHTML = problemSet.instructions;
            document.getElementById("submit").innerHTML = "Start";
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

function changeSet(id) {
    loadSet("PSC/" + id.value + ".psc");
    if (theTimer) {
        clearInterval(theTimer);
        document.getElementById("time").innerHTML = "";
    }
}

function setTimer(time) {
    theStartTime = Date.now() + time * 1000; //ms
    theTimer = setInterval(timer, 10);
}

function finish() {
    var score = problemSet.score();
    console.log(score[0], score[1]);
    alert("Time's up! Score: " + score[0] * score[1]);
}

function timer() {
    var timeLeft = (theStartTime - Date.now()) / 1000;
    if (timeLeft <= 0) {
        clearInterval(theTimer);
        finish();
    }
    document.getElementById("time").innerHTML = timeLeft;
}

var theStartTime, theTimer;
changeSet(document.getElementById("set"));
theStartTime = 1;
