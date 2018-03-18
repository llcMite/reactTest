var path=require('path');
var webpack=require('webpack');

const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports={
    //入口
	entry:{
		index:'./index.js'
	},
	//输出
	output:{
		path:path.resolve(__dirname,'dist'),
		filename:'[name].[hash].js',
	},
	//webpack-dev-server配置
	devtool: 'inline-source-map',  //用于精确定位某个文件报错位置
	devServer:{
		//指定服务器资源的配置属性
		contentBase: path.join(__dirname, "dist"),
		port:7070,
		//host:'0,0,0,0'
		overlay: true,  //当编译出错时在浏览器上显示错误
		stats:'errors-only', //打印想要打印的信息minimal"，"normal"，"verbose
		compress:true, //当它被设置为true的时候对所有的服务器资源采用gzip压缩采用gzip压缩的优点和缺点
        hot:true,      //自动刷新
        inline:true,   //模块热替换
	},
	module:{
        //babel配置
        loaders: [
	        {
	            test: /\.js$/,
	            loader: 'babel-loader',
	            exclude: /node_modules/,
	            query: {
	                presets: ['react', 'env']
	            }
	        },
	    ],
	},
	plugins:[
	   new webpack.HotModuleReplacementPlugin(),
       new HtmlWebpackPlugin({
         title: 'reactTest',
         filename:'index.html',
         template:'./index.html'
       })

	]
}


