// Controller integration fixture. Authentication is tested separately against the real app.
// Existing in-memory stores predate JWT; inject an explicit administrator fixture here only.
const express=require('express'),app=express();
app.use(express.json());
app.use((req,res,next)=>{req.user={id:1,role:'admin',sessionId:'controller-fixture'};next();});
app.get('/',require('../../src/controllers/service').getService);
const r=require('../../src/routes');
app.use('/api/v1',r.transactionRouter);app.use('/api/v1/users',r.userRouter);
app.use('/api/v1/categories',r.categoryRouter);app.use('/api/v1/budgets',r.budgetRouter);
app.use(require('../../src/middlewares/notFound'));app.use(require('../../src/middlewares/errorHandler'));
module.exports=app;
