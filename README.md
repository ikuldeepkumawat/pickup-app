query{
  shopifyFunctions(first: 10){
    edges{
      node{
        id
        title
      }
    }
  }
}


<!-- 019bbbfb-4dd7-73a5-8a1c-40009b0ce9a7 -->


mutation{
  cartTransformCreate( functionId: "019bbbfb-4dd7-73a5-8a1c-40009b0ce9a7"){
    cartTransform {
      id
    }
    userErrors{
      message
    }
  }
}