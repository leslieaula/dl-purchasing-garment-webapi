var Router = require("restify-router").Router;
var db = require("../../../db");
var resultFormatter = require("../../../result-formatter");
var passport = require("../../../passports/jwt-passport");
var Manager = require("dl-module").managers.garmentPurchasing.PurchaseOrderManager;

function getJWTRouter() {

    var options = {
        version: "1.0.0"
    };

    var apiVersion = options.version || "1.0.0";
    var defaultOrder = options.defaultOrder || {};
    var defaultFilter = options.defaultFilter || {};
    var defaultSelect = options.defaultSelect || [];

    var getManager = (user) => {
        return db.get()
            .then((db) => {
                return Promise.resolve(new Manager(db, user));
            });
    };

    var router = new Router();

    router.get("/", passport, function (request, response, next) {
        var user = request.user;
        var query = request.query;

        query.filter = Object.assign({}, query.filter, typeof defaultFilter === "function" ? defaultFilter(request, response, next) : defaultFilter, query.filter, { "_createdBy": request.user.username });
        query.order = Object.assign({}, query.order, typeof defaultOrder === "function" ? defaultOrder(request, response, next) : defaultOrder, query.order, {"_createdDate": -1});
        query.select = query.select ? query.select : ["no","buyer.name", "purchaseRequest.refNo", "purchaseRequest.shipmentDate", "purchaseRequest.no", "purchaseRequest.roNo", "_createdBy", "purchaseOrderExternal.isPosted", "isPosted"];

        if(query.order.quantity){
            var a = query.order.quantity
            query.order["items.0.defaultQuantity"] = a;
            delete query.order.quantity
        }
        if(query.order.product){
            var a = query.order.product
            query.order["items.0.product.name"] = a;
            delete query.order.product
        }
        if(query.order.uom){
            var a = query.order.uom
            query.order["items.0.defaultUom.unit"] = a;
            delete query.order.uom
        }
        getManager(user)
            .then((manager) => {
                return manager.read(query);
            })
            .then(docs => {
                var result = resultFormatter.ok(apiVersion, 200, docs.data);
                delete docs.data;
                result.info = docs;
                return Promise.resolve(result);
            })
            .then((result) => {
                response.send(result.statusCode, result);
            })
            .catch((e) => {
                var statusCode = 500;
                if (e.name === "ValidationError")
                    statusCode = 400;
                var error = resultFormatter.fail(apiVersion, statusCode, e);
                response.send(statusCode, error);
            });
    });


    router.get("/:id", passport, (request, response, next) => {
        var user = request.user;
        var id = request.params.id;
        var query = request.query;
        query.select = query.select ? query.select : typeof defaultSelect === "function" ? defaultSelect(request, response, next) : defaultSelect;

        getManager(user)
            .then((manager) => {
                return manager.getSingleByIdOrDefault(id, query.select);
            })
            .then((doc) => {
                var result;
                if (!doc) {
                    result = resultFormatter.fail(apiVersion, 404, new Error("data not found"));
                }
                else {
                    result = resultFormatter.ok(apiVersion, 200, doc);
                }
                return Promise.resolve(result);
            })
            .then((result) => {
                response.send(result.statusCode, result);
            })
            .catch((e) => {
                var statusCode = 500;
                if (e.name === "ValidationError")
                    statusCode = 400;
                var error = resultFormatter.fail(apiVersion, statusCode, e);
                response.send(statusCode, error);
            });
    });

    router.post("/", passport, (request, response, next) => {
        var user = request.user;
        var data = request.body;

        getManager(user)
            .then((manager) => {
                return manager.createMultiple(data);
            })
            .then((docId) => {
                response.header("Location", `${request.url}/${docId.toString()}`);
                var result = resultFormatter.ok(apiVersion, 201);
                return Promise.resolve(result);
            })
            .then((result) => {
                response.send(result.statusCode, result);
            })
            .catch((e) => {
                var statusCode = 500;
                if (e.name === "ValidationError")
                    statusCode = 400;
                var error = resultFormatter.fail(apiVersion, statusCode, e);
                response.send(statusCode, error);
            });
    });

    router.put("/:id", passport, (request, response, next) => {
        var user = request.user;
        var id = request.params.id;
        var data = request.body;

        getManager(user)
            .then((manager) => {
                return manager.getSingleByIdOrDefault(id)
                    .then((doc) => {
                        var result;
                        if (!doc) {
                            result = resultFormatter.fail(apiVersion, 404, new Error("data not found"));
                            return Promise.resolve(result);
                        }
                        else {
                            return manager.update(data)
                                .then((docId) => {
                                    result = resultFormatter.ok(apiVersion, 204);
                                    return Promise.resolve(result);
                                });
                        }
                    });
            })
            .then((result) => {
                response.send(result.statusCode, result);
            })
            .catch((e) => {
                var statusCode = 500;
                if (e.name === "ValidationError")
                    statusCode = 400;
                var error = resultFormatter.fail(apiVersion, statusCode, e);
                response.send(statusCode, error);
            });
    });

    router.del("/:id", passport, (request, response, next) => {
        var user = request.user;
        var id = request.params.id;

        getManager(user)
            .then((manager) => {
                return manager.getSingleByIdOrDefault(id)
                    .then((doc) => {
                        var result;
                        if (!doc) {
                            result = resultFormatter.fail(apiVersion, 404, new Error("data not found"));
                            return Promise.resolve(result);
                        }
                        else {
                            return manager.delete(doc)
                                .then((docId) => {
                                    result = resultFormatter.ok(apiVersion, 204);
                                    return Promise.resolve(result);
                                });
                        }
                    });
            })
            .then((result) => {
                response.send(result.statusCode, result);
            })
            .catch((e) => {
                var statusCode = 500;
                if (e.name === "ValidationError")
                    statusCode = 400;
                var error = resultFormatter.fail(apiVersion, statusCode, e);
                response.send(statusCode, error);
            });
    });

    return router;
}
module.exports = getJWTRouter;
