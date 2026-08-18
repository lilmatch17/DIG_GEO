package com.antv.l7vp.repository;

import com.antv.l7vp.model.Project;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

@Repository
public class ProjectRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    public List<Project> findAll() {
        String sql = "SELECT PROJECT_ID, PROJECT_NAME, DESCRIPTION, CREATE_TIME, UPDATE_TIME, THUMBNAIL, ASSET_PACKAGE_IDS, MAP_CONFIG FROM PROJECTS ORDER BY UPDATE_TIME DESC";
        return jdbcTemplate.query(sql, new ProjectRowMapper());
    }

    public Project findById(String projectId) {
        String sql = "SELECT PROJECT_ID, PROJECT_NAME, DESCRIPTION, CREATE_TIME, UPDATE_TIME, THUMBNAIL, ASSET_PACKAGE_IDS, MAP_CONFIG FROM PROJECTS WHERE PROJECT_ID = ?";
        List<Project> projects = jdbcTemplate.query(sql, new Object[]{projectId}, new ProjectRowMapper());
        return projects.isEmpty() ? null : projects.get(0);
    }

    public Project insert(Project project) {
        if (project.getProjectId() == null) {
            project.setProjectId(UUID.randomUUID().toString());
        }
        String sql = "INSERT INTO PROJECTS (PROJECT_ID, PROJECT_NAME, DESCRIPTION, CREATE_TIME, UPDATE_TIME, THUMBNAIL, ASSET_PACKAGE_IDS, MAP_CONFIG) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        try {
            String assetPackageIdsJson = project.getAssetPackageIds() != null
                ? objectMapper.writeValueAsString(project.getAssetPackageIds()) : null;
            jdbcTemplate.update(sql,
                project.getProjectId(),
                project.getProjectName(),
                project.getDescription(),
                project.getCreateTime(),
                project.getUpdateTime(),
                project.getThumbnail(),
                assetPackageIdsJson,
                project.getMapConfig()
            );
        } catch (Exception e) {
            throw new RuntimeException("保存项目失败", e);
        }
        return project;
    }

    public Project update(Project project) {
        String sql = "UPDATE PROJECTS SET PROJECT_NAME = ?, DESCRIPTION = ?, UPDATE_TIME = ?, THUMBNAIL = ?, ASSET_PACKAGE_IDS = ?, MAP_CONFIG = ? WHERE PROJECT_ID = ?";
        try {
            String assetPackageIdsJson = project.getAssetPackageIds() != null
                ? objectMapper.writeValueAsString(project.getAssetPackageIds()) : null;
            jdbcTemplate.update(sql,
                project.getProjectName(),
                project.getDescription(),
                project.getUpdateTime(),
                project.getThumbnail(),
                assetPackageIdsJson,
                project.getMapConfig(),
                project.getProjectId()
            );
        } catch (Exception e) {
            throw new RuntimeException("更新项目失败", e);
        }
        return project;
    }

    public void deleteById(String projectId) {
        String sql = "DELETE FROM PROJECTS WHERE PROJECT_ID = ?";
        jdbcTemplate.update(sql, projectId);
    }

    class ProjectRowMapper implements RowMapper<Project> {
        @Override
        public Project mapRow(ResultSet rs, int rowNum) throws SQLException {
            Project project = new Project();
            project.setProjectId(rs.getString("PROJECT_ID"));
            project.setProjectName(rs.getString("PROJECT_NAME"));
            project.setDescription(rs.getString("DESCRIPTION"));
            project.setCreateTime(rs.getString("CREATE_TIME"));
            project.setUpdateTime(rs.getString("UPDATE_TIME"));
            project.setThumbnail(rs.getString("THUMBNAIL"));
            project.setMapConfig(rs.getString("MAP_CONFIG"));
            try {
                String assetPackageIdsJson = rs.getString("ASSET_PACKAGE_IDS");
                if (assetPackageIdsJson != null && !assetPackageIdsJson.isEmpty()) {
                    project.setAssetPackageIds(objectMapper.readValue(assetPackageIdsJson,
                        objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)));
                }
            } catch (Exception e) {
                throw new SQLException("解析ASSET_PACKAGE_IDS失败", e);
            }
            return project;
        }
    }
}
