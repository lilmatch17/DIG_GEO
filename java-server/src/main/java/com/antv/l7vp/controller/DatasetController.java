package com.antv.l7vp.controller;

import com.antv.l7vp.dto.CreateDatasetRequest;
import com.antv.l7vp.dto.CreateDatasetResult;
import com.antv.l7vp.dto.PagedRows;
import com.antv.l7vp.service.DatasetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class DatasetController {

    @Autowired
    private DatasetService datasetService;

    @PostMapping("/projects/{projectId}/datasets/upload")
    public CreateDatasetResult uploadDataset(
            @PathVariable String projectId,
            @RequestBody CreateDatasetRequest request) {
        return datasetService.createDatasetWithRows(projectId, request);
    }

    @GetMapping("/projects/{projectId}/datasets/{datasetId}/rows")
    public PagedRows getRows(
            @PathVariable String projectId,
            @PathVariable String datasetId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "500") int size) {
        return datasetService.getRows(datasetId, page, size);
    }

    @DeleteMapping("/projects/{projectId}/datasets/{datasetId}")
    public ResponseEntity<Void> deleteDataset(
            @PathVariable String projectId,
            @PathVariable String datasetId) {
        try {
            datasetService.deleteDataset(datasetId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
