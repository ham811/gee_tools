# -*- coding: utf-8 -*-
"""
Created on Mon Jun 27 17:28:18 2022

@author: Hamid
"""

// Hamid Amachnoug //
// Universities: HNE EBERSWALDE + WARSAW ULS //
// Master Thesis Project //


// Make a cloud-free Landsat 8 TOA composite (from raw imagery).
var l8 = ee.ImageCollection('LANDSAT/LC08/C01/T1');
var landsatImage= ee.ImageCollection("LANDSAT/LC08/C01/T1")
var image = ee.Algorithms.Landsat.simpleComposite({
  collection: l8.filterDate('2019-01-01', '2019-12-31'),
  asFloat: true
});
var image = image.clip(Shapefile);
// Use these bands for prediction.
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B11'];

// Manually created polygons.
var Forest = ee.Geometry.Rectangle(forest);
var Agriculture = ee.Geometry.Rectangle(agriculture);
var Urban = ee.Geometry.Rectangle(urban);
var Water = ee.Geometry.Rectangle(water);
var Bareland = ee.Geometry.Rectangle(bareland);

// Make a FeatureCollection from the hand-made geometries.
var features = Polygons;
var classe = 'classe'
// Get the values for all pixels in each polygon in the training.
var training = image.select(bands).sampleRegions({
  collection: features,
  properties: ['landcover'],
  // Set the scale to get Landsat pixels in the polygons.
  scale: 20
});

// Create an SVM classifier with custom parameters.
var classifier = ee.Classifier.libsvm({
  kernelType: 'RBF',
  gamma: 0.5,
  cost: 10
});

// Train the classifier.
var trained = classifier.train(training, 'landcover', bands);

// Classify the image.
var classified = image.classify(trained);

// Display the classification result and the input image.
Map.setCenter(13.91, 52.82, 12);
Map.addLayer(image, {bands: ['B4', 'B3', 'B2'], max: 0.4, gamma: 2}, 'RGB Image');
Map.addLayer(features, {}, 'training points');
Map.addLayer(classified, {min: 0, max: 4, palette: ['blue', 'yellow', 'green', 'red', 'orange']},'SVM 1990');



var withRandom = training.randomColumn('random');

//We want to reserve some of the data for testing, to avoid overfitting the model.
var split = 0.7;  // Approximatly 70% training, 30% testing
var trainingPartition = withRandom.filter(ee.Filter.lt('random', split));
var testingPartition = withRandom.filter(ee.Filter.gte('random', split));

// Train 70%
var trainedClassifier = ee.Classifier.libsvm().train({
  features: trainingPartition,
  classProperty: 'landcover',
  inputProperties: bands
});


// Testing.
var test = testingPartition.classify(trainedClassifier);

//Print Confusion MATRIX
var confusionMatrix = test.errorMatrix(classe, 'classification');
print('Confusion Matrix', confusionMatrix);

var confMatrix = trainedClassifier.confusionMatrix()
var OA = confMatrix.accuracy()
var CA = confMatrix.consumersAccuracy()
var Kappa = confMatrix.kappa()
var PA = confMatrix.producersAccuracy()
var Order = confMatrix.order()

print(confMatrix,'Confusion Matrix')
print(OA,'Overall Accuracy')
print(Kappa,'Kappa ')
print(CA,'Consumers Accuracy ')
print(PA,'Producers Accuracy ')
print(Order,'Order')


// Export Classification Results
Export.image.toDrive({
  image:classified,
  description:'Supervised_Classification',
  scale:30,
  folder: 'Download_gee',
  region:Shapefile,
  maxPixels:1e13
})
  
// print(slopes)
var exportAccuracy = ee.Feature(null, {matrix: confMatrix.array()})


// .area() function calculates the area in square meters
var studyArea = Shapefile.geometry().area()
// We can cast the result to a ee.Number() and calculate the area in square kilometers
var stateAreaSqKm = ee.Number(studyArea).divide(1e6).round()
print(stateAreaSqKm)

// Area calculations
var areaImage = ee.Image.pixelArea().addBands(
      classified)
 
var areas = areaImage.reduceRegion({
      reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'classe',
    }),
    geometry: Shapefile.geometry(),
    scale: 30,
    maxPixels: 1e10
    }); 
 
print(areas)

var Studyarea = Shapefile;

// Classes Calculation
var allpix =  classified.updateMask(classified);  // mask the entire layer
var pixstats = allpix.reduceRegion({
  reducer: ee.Reducer.count(),               // count all pixels in a single class
  geometry: Studyarea,
  scale: 30,
  maxPixels: 1e10
  });


var allpixels = ee.Number(pixstats.get('classification')); // extract pixel count as a number

var arealist = [];
var areacount = function(cnr, name) {
 var singleMask =  classified.updateMask(classified.eq(cnr));  // mask a single class
 var stats = singleMask.reduceRegion({
  reducer: ee.Reducer.count(),               // count pixels in a single class
  geometry: Studyarea,
  scale: 30,
  maxPixels: 1e10
  });
var pix =  ee.Number(stats.get('classification'));
var hect = pix.multiply(900).divide(10000);                // Landsat pixel = 30m x 30m --> 900 sqm
var perc = pix.divide(allpixels).multiply(10000).round().divide(100);   // get area percent by class and round to 2 decimals
arealist.push({Class: names2[i], Pixels: pix, Hectares: hect, Percentage: perc});
};
var names2 = ['Water', 'Bareland', 'Forest', 'Agriculture', 'Urban'];

// execute function for each class
for (var i = 0; i < 5; i++) {
  areacount(i, names2[i]);
  }

//Print the results to the Console and examine it.
print('Area Class', arealist, '--> click list objects for individual classes');

